const gulp = require('gulp');
const { spawn } = require('child_process');
const nodemon = require('gulp-nodemon');

// Task to run the TypeScript compiler using child_process
gulp.task('tsc', (done) => {
  const tscProcess = spawn('tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit', shell: true });

  tscProcess.on('close', (code) => {
    if (code === 0) {
      done();
    } else {
      done(new Error(`TypeScript compilation failed with code ${code}`));
    }
  });
});

// Task to run nodemon and restart on changes
gulp.task('nodemon', (done) => {
  let started = false;

  return nodemon({
    script: 'dist/test.js',  // Path to the compiled output
    watch: ['dist'],          // Watch for changes in the compiled output
    exec: 'node',
    env: { 'NODE_ENV': 'development' }
  }).on('start', () => {
    if (!started) {
      started = true;
      done();
    }
  })
});

// Task to watch for TypeScript changes and recompile
gulp.task('watch', () => {
  gulp.watch('src/**/*.ts', gulp.series('tsc'));  // Watch TypeScript files
});

// Default task: Compile, run nodemon, and watch for changes
gulp.task('default', gulp.series('tsc', gulp.parallel('nodemon', 'watch')));
