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

class NodeCronTrigger {
  cronJobs?: {
    tasks?: ITaskOptions;
    scheduledTasks?: ScheduledTask[];
    cronTasks?: Map<string, ScheduledTask>;
  };

  Tasks: ITaskOptions = {};
  store: IStore;

  constructor(tasks?: ITaskOptions, store?: typeof FileStore) {
    // init store
    this.store = store ? new store() : new FileStore();

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
    console.log('==================================================');
    console.log('checking for expaired tasks to run them on startup');
    console.log('==================================================');
    // check if tasks history available or read it
    const tasksHistory = history ? history : await this.getHistory();
    Object.keys(tasksHistory).forEach(task => {
      // check if the file date, time expaired
      const taskUpdatedDate = new Date(tasksHistory[task].nextRunDate);
      // check if the task expaired
      if (taskUpdatedDate < new Date()) {
        console.log('\x1b[36m%s\x1b[0m', 'info:', `${task} has started`);
        // running the task
        if (!tasks[task]?.task) {
          throw new Error('task function isn\'t available in your tasks object');
        }

        // run the task
        tasks[task].task();
      }
    });
  }

  // update tasks next run time
  async #updateTasksDate(tasks: ITaskOptions, history?: ITasksHistory) {
    console.log('====================================');
    console.log('updating tasks date ................');
    console.log('====================================');
    const tasksHistory = history ? history : await this.getHistory();
    Object.keys(tasksHistory).forEach(task => {
      if (tasks[task]) {
        tasksHistory[task].nextRunDate = this.getTaskNextRunTime(tasks[task].schedule);
      }
    });
    
    await this.#updateHistory(tasksHistory);
  }

  async getHistory(): Promise<ITasksHistory> {
    const data = await this.store.getItem('history');
    const tasks: ITasksHistory = JSON.parse(data || '{}');
    return tasks;
  }

  // saving the tasks next run date in history.log
  async #updateHistory(tasksObject: ITasksHistory): Promise<void> {
    // handle re define tasks when data removed
    const keys = Object.keys(tasksObject);
    if (!keys.length) this.#defineTasks(this.Tasks);
    await this.store.setItem('history', JSON.stringify(tasksObject));
  }

  // a function to convert cron expression to date
  getTaskNextRunTime(schedule: string) {
    const nextRun = cronParser.parseExpression(schedule).next();
    return nextRun.toDate();
  }

  async clearHistory(): Promise<void> {
    await this.store.removeItem('history');
  }

  getJobs() {
    return this.cronJobs;
  }

  schedule = cron.schedule;
  validate = cron.validate;
  getTasks = cron.getTasks;
}

export default NodeCronTrigger;
