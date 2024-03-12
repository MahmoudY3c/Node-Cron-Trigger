import cron, { ScheduleOptions, ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import cronParser from 'cron-parser';

export interface ITask {
  task: Function;
  schedule: /* cronStringSyntax */ string;
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

  historyPath: string = '';

  constructor(tasks?: ITaskOptions) {
    if (tasks) {
      this.#init(tasks);
      this.#tasksRunner(tasks);
    }
  }

  #init(tasks: ITaskOptions) {
    // create history.log file
    this.#createHistoryLog();
    // update the tasks History log and get it
    const tasksHistory = this.#defineTasks(tasks);
    // check for expaired tasks and run them on server startup
    this.#runExpairedTasksOnStartup(tasks, tasksHistory);
    // update the tasks next run time to handle their expairation date
    this.#updateTasksDate(tasks, tasksHistory);
  }

  #tasksRunner(tasks: ITaskOptions) {
    const scheduledTasks: ScheduledTask[] = [];

    Object.keys(tasks).forEach((task, index) => {
      // return tasks[task].task()
      const taskData = tasks[task];
      // validate the expression is true
      this.#validateExpression(taskData.schedule);

      // handle createing the tasks
      scheduledTasks[index] = cron.schedule(taskData.schedule, () => {
        taskData.task();
        this.#updateTasksDate(tasks);
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
  #defineTasks(Tasks: ITaskOptions): ITasksHistory {
    try {
      // getting task history
      const history: ITasksHistory = this.getHistory();
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
      this.#updateHistory(history);

      return history;
    } catch (error: any) {
      // error.message = 'Error saving tasks to JSON file: ' + error.message;
      throw error;
    }
  }

  // check and run expaired tasks on server startup
  #runExpairedTasksOnStartup(tasks: ITaskOptions, history: ITasksHistory) {
    console.log('==================================================');
    console.log('checking for expaired tasks to run them on startup');
    console.log('==================================================');
    // check if tasks history available or read it
    const tasksHistory = history ? history : this.getHistory();
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
  #updateTasksDate(tasks: ITaskOptions, history?: ITasksHistory) {
    console.log('====================================');
    console.log('updating tasks date ................');
    console.log('====================================');
    const tasksHistory = history ? history : this.getHistory();
    Object.keys(tasksHistory).forEach(task => {
      if (tasks[task]) {
        tasksHistory[task].nextRunDate = this.getTaskNextRunTime(tasks[task].schedule);
      }
    });

    this.#updateHistory(tasksHistory);
  }

  #createHistoryLog() {
    this.historyPath = this.#dir('history.log');
    // check if the tasks history file exists in the current directory or not to create it
    if (!fs.existsSync(this.historyPath)) {
      fs.writeFileSync(this.historyPath, '{}');
    }
  }

  getHistory(): ITasksHistory {
    const data = fs.readFileSync(this.historyPath, 'utf-8');
    const tasks = JSON.parse(data || '{}');
    return tasks;
  }

  // saving the tasks next run date in history.log
  #updateHistory(tasksObject: ITasksHistory) {
    fs.writeFileSync(this.historyPath, JSON.stringify(tasksObject, null, 2), 'utf8');
  }

  // a function to convert cron expression to date
  getTaskNextRunTime(schedule: string) {
    const nextRun = cronParser.parseExpression(schedule).next();
    return nextRun.toDate();
  }

  // get the dirname + add the file path
  #dir(d: string) {
    return path.resolve(__dirname, d);
  }

  clearHistory() {
    fs.unlinkSync(this.historyPath)
  }

  getJobs() {
    return this.cronJobs;
  }

  schedule = cron.schedule;
  validate = cron.validate;
  getTasks = cron.getTasks;
}

export default NodeCronTrigger;
