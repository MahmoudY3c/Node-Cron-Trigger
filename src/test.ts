// the value is an object of pairs key / value - key = task name and value = object that have your cron options

import NodeCronTrigger, { ITaskOptions } from ".";

const tasks: ITaskOptions = {
  "runAt12AM": {
    schedule: '0 0 0 * * *',
    options: {
      scheduled: true,
    },
    task() {
      console.log('hey whatever you did i will run at 12 AM even if after restarting your server');
    },
  },
  "runEach1Mins": {
    schedule: '*/1 * * * *',
    task() {
      console.log('hey whatever you did i will run each 1 minutes of any hour even if after restarting your server');
    },
  },
};

const runner = new NodeCronTrigger(tasks);


// setTimeout(() => {
  // console.log(runner.Tasks)
  // runner.store.getItem('history').then(history => console.log(JSON.parse(history), '............ history ..............'));
// }, 1000 * 2);

// console.log(runner.getJobs());

// get the tasks history object
// console.log(runner.getHistory());
// false
// console.log(runner.validate('* 4'));
// // get history file path
// console.log(runner.historyPath);
// console.log(runner.getTaskNextRunTime('0 0 0 * * *'))