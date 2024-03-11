// a set of handlers to save the history of tasks and calculate the next run time for tasks and execute them if they are expaired on server startup.
import fs from 'fs';
import path from 'path';
import cronParser from 'cron-parser';
import { ITaskOptions } from './NodeCronTrigger';

const dir = (d: string) => path.resolve(__dirname, d);
// Directory to store tasks history
const historyPath = dir('history.log');

interface ITasksData {
  createdAt: Date;
  nextRunDate: Date;
}

interface ITasksHistory {
  [key: string]: ITasksData;
}

// read the tasks history that save the tasks next run date
function readTasks(): ITasksHistory {
  const data = fs.readFileSync(historyPath, 'utf-8');
  const tasks = JSON.parse(data || '{}');
  return tasks;
}

// saving the tasks next run date in history.log
function saveModifiedTasks(tasksObject: ITasksHistory) {
  fs.writeFileSync(historyPath, JSON.stringify(tasksObject, null, 2), 'utf8');
}

// a function to convert cron expression to date
function getNextRunTime(schedule: string) {
  const nextRun = cronParser.parseExpression(schedule).next();
  return nextRun.toDate();
}

// a function that takes the object of tasks to handle defining tasks to history.log including tasks created data and next run date
// the key in the object is the task name and the value is object takes { schedule }
function defineTasks(Tasks: ITaskOptions): ITasksHistory {
  try {
    // getting task history
    const history: ITasksHistory = readTasks();
    // getting tasks names then loop
    const TasksArray = Object.keys(Tasks);
    TasksArray.forEach(task => {
      // check if task already exists or not to define it
      if (!history[task]) {
        history[task] = {
          createdAt: new Date(),
          nextRunDate: getNextRunTime(Tasks[task].schedule),
        };
      }
    });

    // saving tasks
    saveModifiedTasks(history);

    return history;
  } catch (error) {
    // throw 'Error saving tasks to JSON file: ' + error;
    throw error;
  }
}

// get the object of tasks and start proccessing tasks to check if their run time is passed to run them or just exected to save the next run time in the task history.log
function initializeTasks(tasks: ITaskOptions) {
  // check if the tasks history file exists in the current directory or not to create it
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, '{}');
  }

  // getting the tasks history
  const tasksHistory = defineTasks(tasks);
  // check for expaired tasks and run them on server startup
  runExpairedTasksOnStartup(tasks, tasksHistory);
  // update the tasks next run time to handle their expairation date
  updateTasksDate(tasks, tasksHistory);
}

// check and run expaired tasks on server startup
function runExpairedTasksOnStartup(tasks: ITaskOptions, history: ITasksHistory) {
  console.log('==================================================');
  console.log('checking for expaired tasks to run them on startup');
  console.log('==================================================');
  // check if tasks history available or read it
  const tasksHistory = history ? history : readTasks();
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

      tasks[task].task();
    }
  });
}

// update tasks next run time
function updateTasksDate(tasks: ITaskOptions, history?: ITasksHistory) {
  console.log('====================================');
  console.log('updating tasks date ................');
  console.log('====================================');
  const tasksHistory = history ? history : readTasks();
  Object.keys(tasksHistory).forEach(task => {
    if (tasks[task]) {
      tasksHistory[task].nextRunDate = getNextRunTime(tasks[task].schedule);
    }
  });
  saveModifiedTasks(tasksHistory);
}

export {
  defineTasks,
  initializeTasks,
  runExpairedTasksOnStartup,
  updateTasksDate,
  getNextRunTime,
};

