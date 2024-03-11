# Node-Cron-Trigger

- `Node-Cron` is a perfect option to schedule tasks on server side to run in a specific time of the day but what if your task is should run at `12.00 AM` and the server stopped at `11.59 PM` and starts again at `12.01 AM` that's mean your cron task won't run again untill the next day so here we need a solution to handle those expaired tasks at any app that's what `Node-Cron-Trigger` does it will save your tasks data in a file called `history.log` that will save your cron createdAt date and nextRunDate date and whenever the server restart it will check for the tasks that need to get run if their nextRunDate is passed or not and if they are is passed then it will run them and update it's `nextRunDate` property that will happens just with expaired tasks but if the task run without any problems it's will never do anything it will just update that task `nextRunDate` property and keep going that's the process and let's go in details

# Usage
