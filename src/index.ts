// the value is an object of pairs key / value - key = task name as it's a good behaviour to give your task a name and value = object that have your cron options

import NodeCronTrigger, { ITaskOptions } from "./NodeCronTrigger";

// type cronStringSyntax = '* * * * * *';


const tasks: ITaskOptions = {
  "runAt12AM": {
    schedule: '12 28 8 74 47 5',
    task() {
      console.log('hey whatever you did i will run at 12 AM even if after restarting your server');
    }
  },
  "runEach5Mins": {
    schedule: '',
    task() {
      console.log('hey whatever you did i will run each 5 minutes of any hour even if after restarting your server');
    }
  },
};

const runner = new NodeCronTrigger(tasks);

console.log(runner.getJobs());
