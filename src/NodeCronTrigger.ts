import cron, { ScheduleOptions, ScheduledTask } from 'node-cron';
import { initializeTasks, updateTasksDate } from './jobs-server-start-trigger';

export interface ITask {
  task: Function;
  schedule: /* cronStringSyntax */ string;
  options?: ScheduleOptions;
}

export interface ITaskOptions {
  [key: string]: ITask;
}

class NodeCronTrigger {
  cronJobs?: {
    tasks?: ITaskOptions;
    scheduledTasks?: ScheduledTask[];
  };

  constructor(tasks: ITaskOptions) {
    initializeTasks(tasks);

    const scheduledTasks: ScheduledTask[] = [];

    Object.keys(tasks).forEach((task, index) => {
      // return tasks[task].task()
      const taskData = tasks[task];
      scheduledTasks[index] = cron.schedule(taskData.schedule, () => {
        taskData.task();
        updateTasksDate(tasks);
      }, taskData.options || {});
    });

    this.cronJobs = {
      tasks,
      scheduledTasks,
    };
  }

  getJobs() {
    return this.cronJobs;
  }

  schedule = cron.schedule;
  validate = cron.validate;
  getTasks = cron.getTasks;
}

export default NodeCronTrigger;
