import cron, { ScheduleOptions, ScheduledTask } from 'node-cron';
import cronParser from 'cron-parser';
import FileStore from './Store/FileStore';

export interface IStore {
  setItem: (key: string, value: any) => Promise<boolean>;
  getItem: (key: string) => Promise<any>;
  removeItem: (key: string) => Promise<boolean>;
}

export interface ITask {
  task: Function;
  schedule: string;
  options?: ScheduleOptions;
}

export interface ITaskOptions {
  [key: string]: ITask;
}

export interface ITasksData {
  createdAt: Date;
  nextRunDate: Date;
}

export interface ITasksHistory {
  [key: string]: ITasksData;
}

export type ITaskOptionsList = { logging?: boolean;[key: string]: any } & (
  { store: IStore }
  | { historyFileName?: string, historyFilePath: string }
)

export type INodeCronTriggerCronJobs = {
  tasks?: ITaskOptions;
  scheduledTasks?: ScheduledTask[];
  cronTasks?: Map<string, ScheduledTask>;
};

/**
 * @typedef {import('../types/index.d.ts').ITaskOptions} ITaskOptions
 * @typedef {import('../types/index.d.ts').ITaskOptionsList} ITaskOptionsList
 * @typedef {import('../types/index.d.ts').ITasksHistory} ITasksHistory
 * @typedef {import('../types/index.d.ts').INodeCronTriggerCronJobs} INodeCronTriggerCronJobs
 */

export class NodeCronTrigger {
  cronJobs?: INodeCronTriggerCronJobs;
  Tasks: ITaskOptions = {};
  store: IStore;
  logging: boolean;

  /**
   * node cron wrapper provider
   * @param { ITaskOptions } tasks 
   * @param { ITaskOptionsList } options 
   */
  constructor(tasks: ITaskOptions, options: ITaskOptionsList) {
    if (!options?.historyFilePath && !options?.store) {
      throw new Error('Please provide history file path or store instance');
    }

    // enable logging by default
    if (typeof options.logging !== 'boolean') {
      options.logging = true;
    }

    this.logging = options.logging;

    // init store
    if (options?.store) {
      this.store = options.store;
    } else {
      this.store = new FileStore(options?.historyFilePath, options?.historyFileName);
    }

    if (tasks) {
      this.#init(tasks)
        .then(() => {
          this.#tasksRunner(tasks);
        });
    }
  }

  async #init(tasks: ITaskOptions) {
    // update the tasks History log and get it
    const tasksHistory = await this.#defineTasks(tasks);
    // check for expaired tasks and run them on server startup
    await this.#runExpairedTasksOnStartup(tasks, tasksHistory);
    // update the tasks next run time to handle their expairation date
    await this.#updateTasksDate(tasks, tasksHistory);
  }

  #tasksRunner(tasks: ITaskOptions) {
    const scheduledTasks: ScheduledTask[] = [];

    Object.keys(tasks).forEach((task, index) => {
      // return tasks[task].task()
      const taskData = tasks[task];
      // validate the expression is true
      this.#validateExpression(taskData.schedule);

      // handle createing the tasks
      scheduledTasks[index] = cron.schedule(taskData.schedule, async () => {
        taskData.task();
        await this.#updateTasksDate(tasks);
      }, taskData.options || {});
    });

    this.cronJobs = {
      tasks,
      scheduledTasks,
      cronTasks: this.getTasks(),
    };
  }

  #validateExpression(schedule: string) {
    // validate schedule expression 
    const isValidCronExpression = this.validate(schedule);
    if (!isValidCronExpression) {
      throw new Error(`Invalid cron expression '${schedule}'`);
    }
  }

  // a function that takes the object of tasks to handle defining tasks to history.log including tasks created data and next run date
  // the key in the object is the task name and the value is object takes { schedule }
  async #defineTasks(Tasks: ITaskOptions): Promise<ITasksHistory> {
    try {
      // getting task history
      const history: ITasksHistory = await this.getHistory();
      // getting tasks names then loop
      const TasksArray = Object.keys(Tasks);
      TasksArray.forEach(taskName => {
        // check if task already exists or not to define it
        if (!history[taskName]) {
          // validate the expression is true
          this.#validateExpression(Tasks[taskName].schedule);

          history[taskName] = {
            createdAt: new Date(),
            nextRunDate: this.getTaskNextRunTime(Tasks[taskName].schedule),
          };
        }
      });

      // saving tasks
      await this.#updateHistory(history);
      this.Tasks = Tasks;

      return history;
    } catch (error: any) {
      // error.message = 'Error saving tasks to JSON file: ' + error.message;
      throw error;
    }
  }

  // check and run expaired tasks on server startup
  async #runExpairedTasksOnStartup(tasks: ITaskOptions, history: ITasksHistory) {
    if (this.logging) {
      console.log('==================================================');
      console.log('checking for expaired tasks to run them on startup');
      console.log('==================================================');
    }

    // check if tasks history available or read it
    const tasksHistory = history ? history : await this.getHistory();
    Object.keys(tasksHistory).forEach(task => {
      // check if the file date, time expaired
      const taskUpdatedDate = new Date(tasksHistory[task].nextRunDate);
      // check if the task expaired
      if (taskUpdatedDate < new Date()) {
        // running the task
        if (!tasks[task]?.task) {
          this.#removeHistoryKey(task, tasksHistory);
          return; // skip when a task is defined but never used
          // throw new Error('task function isn\'t available in your tasks object');
        }


        console.log('\x1b[36m%s\x1b[0m', 'info:', `${task} has started`);
        // run the task
        tasks[task].task();
      }
    });
  }

  // update tasks next run time
  async #updateTasksDate(tasks: ITaskOptions, history?: ITasksHistory) {
    if (this.logging) {
      console.log('====================================');
      console.log('updating tasks date ................');
      console.log('====================================');
    }

    const tasksHistory = history ? history : await this.getHistory();
    Object.keys(tasksHistory).forEach(task => {
      if (tasks[task]) {
        tasksHistory[task].nextRunDate = this.getTaskNextRunTime(tasks[task].schedule);
      }
    });

    await this.#updateHistory(tasksHistory);
  }

  /**
   * helper to get the history log data 
   * ? Note: at the first usage time you may need to setTimeout to use this method because the history won't be available yet.
   * @returns {Promise<ITasksHistory>}
   */
  async getHistory(): Promise<ITasksHistory> {
    const data = await this.store.getItem('history');
    const tasks: ITasksHistory = JSON.parse(data || '{}');
    return tasks;
  }

  async #removeHistoryKey(key: string, history: ITasksHistory): Promise<boolean> {
    delete history[key];
    await this.store.setItem('history', JSON.stringify(history));
    return true;
  }

  // saving the tasks next run date in history.log
  async #updateHistory(tasksObject: ITasksHistory): Promise<void> {
    // handle re define tasks when data removed
    const keys = Object.keys(tasksObject);
    if (!keys.length) this.#defineTasks(this.Tasks);
    await this.store.setItem('history', JSON.stringify(tasksObject));
  }

  /**
   * a helper function to get the next run time for your task if you need to check it out
   * @param { string } schedule cron expression
   * @returns { Date }
   */
  // a function to convert cron expression to date
  getTaskNextRunTime(schedule: string): Date {
    const nextRun = cronParser.parseExpression(schedule).next();
    return nextRun.toDate();
  }

  /**
   * helper function to clear the logs history by self
   * @returns {Promise<void>}
   */
  async clearHistory(): Promise<void> {
    await this.store.removeItem('history');
  }

  /**
   * get list of all your tasks data 
   * ? Note: you may need to setTimeout to use this method because it task time to run tasks and update the cronJobs so 2s mybe enough
   * @returns {INodeCronTriggerCronJobs | undefined}
   */
  getJobs(): INodeCronTriggerCronJobs | undefined {
    return this.cronJobs;
  }

  schedule = cron.schedule;
  validate = cron.validate;
  getTasks = cron.getTasks;
}

