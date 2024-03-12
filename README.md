# Node-Cron-Trigger
- A Node cron wrapper to run your tasks even if their running time is gone

# Summary
- `Node-Cron` is a perfect option to schedule tasks on server side to run in a specific time of the day but what if your task is should run at `12.00 AM` and the server stopped at `11.59 PM` and starts again at `12.01 AM` that's mean your cron task won't run again untill the next day so here we need a solution to handle those expaired tasks at any app that's what `Node-Cron-Trigger` does it will save your tasks data in a file called `history.log` that will save your cron tasks by names in array of objects and each object have 2 keys `createdAt` and `nextRunDate` so whenever the server restart it will check for the tasks that need to get run if their nextRunDate is passed or not and if they are is passed then it will run them and update it's `nextRunDate` property that will happens just with expaired tasks but if the task run without any problems it's will never do anything it will just update that task `nextRunDate` property and keep going that's the process and let's go in details

# Usage

- `Node-Cron-Trigger` lets you define the tasks as an object of keys - the key = `the task name` and the value is an object with 3 options
  * __schedule:__ the cron expression like `* * * * * *`
  * __options:__ `node-cron` schedule options you can find it in the following url [Schedule Options](https://github.com/node-cron/node-cron?tab=readme-ov-file#options)
  * __task:__ your task handler

- Usage example
``` javascript
import NodeCronTrigger from "node-cron-trigger";

const tasks = {
  "runAt12AM": {
    schedule: '0 0 0 * * *',
    options: {
      scheduled: true,
    },
    task() {
      console.log('hey whatever you did i will run at 12 AM even if after restarting your server');
    },
  },
  "runEach5Mins": {
    schedule: '* 5 * * * *',
    task() {
      console.log('hey whatever you did i will run each 5 minutes of any hour even if after restarting your server');
    },
  },
};

const runner = new NodeCronTrigger(tasks);

console.log(runner.getJobs());
```

