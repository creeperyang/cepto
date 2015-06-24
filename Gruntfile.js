'use strict';

// Configurable paths for the application
var appConfig = {
    app: 'src',
    dist: 'dist',
    demo: 'demo'
};

module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Define the configuration for all the tasks
    grunt.initConfig({
        config: appConfig,
        copy: {
            dist: {
                expand: true, // 当使用cwd时需要expand，动态src的映射
                cwd: '<%= config.dist %>/', // 相对于src，需要/
                src: '*.js',
                dest: '<%= config.demo %>/', // 需要/
                ext: '.js', //是否修改目标文件的后缀名
            }
        },
        clean: {
            dist: {
                src: '<%= config.dist %>/**/*',
                dot: true,
                expand: true
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                force: true, // wont stop if hint failed
                verbose: true,
                reporter: require('jshint-stylish')
            },
            all: {
                src: [
                    'Gruntfile.js',
                    //'<%= config.app %>/{,*/}*.js'
                    '<%= config.app %>/event.js'
                ]
            }
        },
        uglify: {
            options: {
                compress: false,
                mangle: false,
                beautify: true
            },
            dist: {
                expand: true,
                cwd: '<%= config.dist %>/',
                src: '**/*.js',
                dest: '<%= config.dist %>/',
                ext: '.min.js'
            },
            mindist: {
                options: {
                    compress: true,
                    mangle: true,
                    beautify: false
                },
                expand: true,
                cwd: '<%= config.dist %>/',
                src: '**/*.js',
                dest: '<%= config.dist %>/',
                ext: '.mini.js'
            }
        },
        watch: {
            bower: {
                files: ['bower.json'],
                tasks: ['wiredep']
            },
            gruntfile: {
                files: ['Gruntfile.js']
            },
            less: {
                files: ['<%= config.app %>/*.less'],
                tasks: ['less:dist']
            },
            js: {
                files: ['<%= config.app %>/*.js'],
                tasks: ['clean', 'jshint', 'browserify:dist', 'uglify:dist', 'copy:dist']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [ // 监听到文件变化不执行任何task，直接reload
                    '<%= config.demo %>/{,*/}*.{js,css,html}',
                    '<%= config.dist %>/{,*/}*.{js,css}'
                ]
            }
        },
        // The actual grunt server settings
        connect: {
            options: {
                port: 9080,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: '0.0.0.0',
                livereload: 35729
            },
            livereload: {
                options: {
                    open: false, // 自动打开浏览器
                    middleware: function(connect) {
                        return [
                            connect().use(
                                '/bower_components',
                                connect.static('./bower_components')
                            ),
                            connect.static(appConfig.demo),
                            connect.static(appConfig.dist)
                        ];
                    }
                }
            },
            dist: {
                options: {
                    open: true,
                    base: '<%= config.demo %>'
                }
            }
        },
        // compile less to css
        less : {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= config.app %>/',
                    src: '*.less',
                    dest: '<%= config.dist %>/',
                    ext: '.css'
                }]
            }
        },
        browserify: {
            dist: {
                files: {
                    '<%= config.dist %>/cepto.js': ['<%= config.app %>/cepto.js'],
                }
            }
        }

    });

    grunt.registerTask('build', [
        'clean',
        'less:dist',
        'jshint',
        'browserify:dist',
        'uglify:dist',
        'copy:dist'
    ]);

    grunt.registerTask('min', [
        'uglify:mindist'
    ]);

    grunt.registerTask('serve', 'Compile then start a connect web server', function() {
        if (grunt.option('local')) {
            grunt.config.set('connect.options.hostname', 'localhost');
        }

        grunt.task.run([
            'build',
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('default', ['serve']);

};
