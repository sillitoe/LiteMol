var gulp = require('gulp'),
    plugins = {
        concat: require('gulp-concat'),
        rename: require('gulp-rename'),
        ts: require('gulp-typescript'),
        merge: require('merge2'),
        clean: require('gulp-clean'),
        insert: require('gulp-insert'),
        unique: require('gulp-unique-files'),
        sass: require('gulp-sass'),
        uglify: require('gulp-uglify'),
    };

function build(name) {
    return require(`./LiteMol.${name}/build`)(gulp, plugins);
}

function buildts(root) {
    let project = plugins.ts.createProject(root + '/tsconfig.json');
    let b = project.src().pipe(plugins.ts(project));    
    return b.js.pipe(gulp.dest(root));
}

gulp.task('Viewer-min', [], function() {
    var css =  gulp.src(['./LiteMol.Plugin/Skin/LiteMol-plugin.scss'])
        .pipe(plugins.sass({ outputStyle: 'compressed' }).on('error', plugins.sass.logError))
        .pipe(plugins.rename('LiteMol-plugin.min.css'))
        .pipe(gulp.dest('./LiteMol.Viewer/assets/css'));
        
    var js =  gulp.src(['./build/LiteMol-plugin.js'])
        .pipe(plugins.uglify())
        .pipe(plugins.rename('LiteMol-plugin.min.js'))
        .pipe(gulp.dest('./LiteMol.Viewer'));
   
   return plugins.merge([
      css,
      js
   ]);    
})

function Viewer() {
    var css =  gulp.src(['./LiteMol.Plugin/Skin/LiteMol-plugin.scss'])
        .pipe(plugins.sass().on('error', plugins.sass.logError))
        .pipe(gulp.dest('./LiteMol.Viewer/assets/css'));
        
    var js =  gulp.src(['./dist/LiteMol-plugin.js'])
        .pipe(gulp.dest('./LiteMol.Viewer'));
   
   console.log('Building Viewer and Examples');
   
   return plugins.merge([
      css,
      js,
      buildts('./LiteMol.Viewer'),
      buildts('./LiteMol.Viewer/Examples/Commands'),
      buildts('./LiteMol.Viewer/Examples/CustomControls'),
      buildts('./LiteMol.Viewer/Examples/CustomDensity'),
      buildts('./LiteMol.Viewer/Examples/SplitSurface'),
   ]);    
}

function ViewerUpdate() {
    var css =  gulp.src(['./LiteMol.Plugin/Skin/LiteMol-plugin.scss'])
        .pipe(plugins.sass().on('error', plugins.sass.logError))
        .pipe(gulp.dest('./LiteMol.Viewer/assets/css'));
        
    var js =  gulp.src(['./dist/LiteMol-plugin.js'])
        .pipe(gulp.dest('./LiteMol.Viewer'));
   
   console.log('Updating Viewer');
   
   return plugins.merge([
      css,
      js
   ]);    
}

gulp.task('Viewer', [], Viewer)
gulp.task('Viewer-update', [], ViewerUpdate)
gulp.task('Viewer-inline', ['Plugin'], Viewer)


gulp.task('default', [
    build('Core'), 
    build('Visualization'),
    build('Bootstrap'),
    build('Plugin'),
    'Viewer-inline'
], function () {
    console.log('Done');
});