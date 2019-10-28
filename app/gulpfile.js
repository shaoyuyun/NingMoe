var gulp = require('gulp'),
    less = require('gulp-less'),
    pug = require('gulp-pug'),
    clean = require('gulp-clean'),
    connect = require('gulp-connect'),
    postcss = require('gulp-postcss'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    autoprefixer = require('gulp-autoprefixer'),
    sourcemaps = require('gulp-sourcemaps'),
    miniCss = require('gulp-clean-css'),
    lessPluginAutoPrefix = require('less-plugin-autoprefix'),
    plumber = require('gulp-plumber');

var autoprefix = new lessPluginAutoPrefix({
    browsers: [
        "Chrome >= 20",
        "Firefox >= 19",
        "Opera >= 12",
        "Safari >= 6"
    ]
});

gulp.task('lessmin', function() {
    gulp.src(['src/less/*.less'])
        .pipe(less({ plugins: [autoprefix] }))
        .pipe(plumber())
        .pipe(less({ compress: true }))
        .pipe(gulp.dest('dist/style'));
});

gulp.task('pug', function() {
    gulp.src('src/pug/*.pug')
        .pipe(plumber())
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('imagemin', function() {
    gulp.src(['src/images/**'])
        .pipe(imagemin({
            progressive: true,
            optimizationLevel: 2, //优化压缩 数字越大压缩越多 0~7
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/images'));
});

gulp.task('scriptsbuild', function() {
    gulp.src([
            'src/scripts/lib/modal.js',
            'src/scripts/lib/swiper3.min.js',
            'src/scripts/lib/mustache.min.js',
            'src/scripts/lib/hls.min.js',
            'src/scripts/lib/DPlayer.min.js'
        ])
        .pipe(concat({
            path: 'lib.js',
            newLine: ';'
        }))
        .pipe(gulp.dest('dist/js'))
});

gulp.task('clean', function() {
    gulp.src('dist')
        .pipe(clean());
});

gulp.task('copy', function() {
    gulp.src(['src/scripts/inline/*.js'])
        .pipe(gulp.dest('dist/js/inline/'));
    gulp.src(['src/less/modules/DPlayer.min.css'])
        .pipe(gulp.dest('dist/style/inline/'));
});

gulp.task('watch', function() {
    gulp.watch(['src/less/**/*.less'], ['lessmin']);
    gulp.watch(['src/pug/**/*.pug'], ['pug']);
    gulp.watch(['src/scripts/lib/*.js'], ['scriptsbuild']);
    gulp.watch(['src/images/**'], ['imagemin']);
    gulp.watch(['src/scripts/inline/*.js'], ['copy']);
});

gulp.task('connect', function() {
    connect.server({
        root: 'dist',
        host: '0.0.0.0',
        livereload: true
    });
});

gulp.task('default', ['lessmin', 'pug', 'scriptsbuild', 'imagemin', 'connect', 'watch', 'copy']);