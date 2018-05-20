const path = require('path'),      
      downloadRepo = require('download-git-repo'),
      remoteOriginUrl = require('remote-origin-url'),
      config = require('../../config');

const { file, inquirer, ora, chalk } = require('schemium-api').essentials;

function setProjectsRoot(projectsPath) {
      return new Promise(resolve => {
         if (projectsPath) {
            console.log(`root path: ${projectsPath}`)
            resolve({ root: path.trim().replace(new RegExp(' ', 'g'), '-').toLowerCase() })
         } else {
            const cwd = process.cwd() + '/';
   
            return inquirer.prompt({
               type: 'input',
               name: 'root',
               message: 'root path:',
               default: cwd,
               filter: function (asw) {
                  let path = asw.trim().replace(new RegExp(' ', 'g'), '-').toLowerCase();
   
                  if (new RegExp('^/').test(path))
                     return path;
                  else {
                     return cwd + path;
                  }
               }
            })
            .then(path => resolve(path))
         }
      });
}

function checkProjectsRoot(projectsPath) {      
   return new Promise((resolve, reject) => {
      file.exists(`${projectsPath.root}/package.json`.replace('//', '/', 'g'), 
         (err, stat) => {
            if (err) {
               if (err.code == 'ENOENT') {
                  resolve({
                        continue: true,
                        projectsPath: projectsPath.root
                  });
               } else {
                  reject(err.code);
               }
            } else {
               console.log(chalk.yellow(`The path ${projectsPath.root} already has a package.json file.`));
               console.log(chalk.yellow.bold(`If you decide to continue, the existent file will be overwritten.\n`));

               inquirer.prompt({
                  type: 'confirm',
                  name: 'continue',
                  message: `Continue anyway?`,
                  default: true
               })
               .then(goon => {
                  console.log();
                  resolve({
                        continue: goon.continue,
                        projectsPath: projectsPath.root
                  })
               });
            }
         });
   })
   .then(res => {         
      if (res.continue) {
         return res.projectsPath;
      } else {
         console.log("Aborted!");
         process.exit(0);
      }
   })
   .catch(ex => {
      throw new Error(ex);
   })
}

function getPackageDependencies(package) {
      return inquirer.prompt({
            type: 'checkbox',
            message: 'Choose which dependencies your project depends on:',
            name: 'dependencies',
            choices: [{
                  name: '@appt/api'
            }, {
                  name: '@appt/mongoose'
            }]
      })
      .then(chosen => {
            const all = {
                  "@appt/api": "^1.0.19",                  
                  "@appt/mongoose": "^1.0.20"
            };

            const dependencies = Object.keys(all).reduce((prev, crr) => {
                  const choice = chosen.dependencies.find(dep => dep === crr);
                  return Object.assign(prev, { [choice]: all[choice] })
            }, {
                  "@appt/core": "^1.0.19"
            });

            return Object.assign(package, {
                  "dependencies": dependencies,
                  "devDependencies": {
                        "babel-cli": "^6.26.0",
                        "babel-preset-es2015": "^6.24.1",
                        "rimraf": "^2.6.2",
                        "babel-plugin-transform-decorators-legacy": "^1.3.4"
                  }
            });
      });
}


function getGitInfo(projectsPath) {      
   return new Promise(resolve => {
      remoteOriginUrl(`${projectsPath}/.git/config`,
      (err, url) => {
         if (url) {
            url = url.split('.git').shift();

            resolve({
                  info: {
                        repository: {
                              url: `git+${url}.git`
                        },
                        bugs: {
                              url: `${url}/issues`
                        },
                        homepage: `${url}#readme`
                  },
                  projectsPath: projectsPath
            });

         } else {
            let prompt = inquirer.prompt({
               type: 'input',
               name: 'git',
               message: 'git url:',
               validate: function (input) {
                  var pattern = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
                  return (input && new RegExp(pattern).test(input)) || input && 'This is not a valid url.' || true
               }
            })
            .then(url => {
               if (url.git) {
                  url = url.git.split('.git').shift();

                  return {
                        info: {
                              repository: {
                                    url: `git+${url}.git`
                              },
                              bugs: {
                                    url: `${url}/issues`
                              },
                              homepage: `${url}#readme`
                        },
                        projectsPath: projectsPath
                  }
               }

               return {
                  info: {},
                  projectsPath: projectsPath
            };
            });

            resolve(prompt)
         }
      });
   });
}

function setPackageJson(git) {      
   const prompt = inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'name:',
      default: git.projectsPath.split('/').pop()
   }, {
      type: 'input',
      name: 'version',
      message: 'version:',
      default: "0.0.1"
   }, {
      type: 'input',
      name: 'description',
      message: 'description:'
   }, {
      type: 'input',
      name: 'keywords',
      message: 'keywords:',
      filter: function (asw) {
         return asw.split(' ')
      }
   }, {
      type: 'input',
      name: 'author',
      message: 'author:'
   }, {
      type: 'input',
      name: 'license',
      message: 'license:',
      default: 'ISC'
   }]);
               
      return prompt.then(answers => Object.assign(
            {
                  name: answers.name,
                  version: answers.version,
                  description: answers.description,
                  author: answers.author,
                  main: "main.module.js",
                  scripts: {
                        build: "rimraf dist/ && babel ./ --out-dir dist/ --ignore ./data/,./node_modules,./.babelrc,./package.json,./npm-debug.log --copy-files",
                        start: "npm run build && node dist/src/main.module.js"
                  },
                  keywords: answers.keywords,
                  license: answers.license
            }, 
            git.info
      ))
      .then(package => getPackageDependencies(package))      
      .then(package => {            
            const packageStringified = JSON.stringify(package, null, 4);      

            console.log(`\nAbout to write to: ${git.projectsPath}`)
            console.log(packageStringified)

            return inquirer.prompt({
                  type: 'confirm',
                  name: 'create',
                  message: 'Is this ok?',
                  default: true
            })
            .then(answer => Object.assign(answer, { packageStringified: packageStringified }));
      })
      .then(res => {
            if (res.create) {
                  console.log("");
                  const spinner = ora('Creating package.json file...').start();

                  return file.write({
                        to: git.projectsPath + '/package.json',
                        content: res.packageStringified
                  })
                  .then(() => {
                        return {
                        spinner: spinner,
                        package: JSON.parse(res.packageStringified)
                        }
                  });
            } else {
                  console.log("Aborted!");
                  process.exit(0);
            }
      })   
      .then(res => {
            return new Promise(resolve => {
                  setTimeout(function () {
                        res.spinner.succeed("package.json created!");

                        resolve(git.projectsPath);
                  }, 1500);
            });
      })
      .catch(ex => {
            console.log();
            throw new Error(ex);
      });
}

function addEssentials(project) {
      console.log();

      return inquirer.prompt({
            type: 'checkbox',
            message: 'Choose some extra files, if you want:',
            name: 'files',
            choices: [{
                  name: '.gitignore'
            }, {
                  name: 'README.md'
            }, {
                  name: 'docker-compose.yml - MongoDB container'
            }]
      })
      .then(chosen => {
            if(chosen.files && chosen.files.length > 0){
                  const spinner = ora('Adding files to the project...').start();
                  
                  const files = chosen.files.map(file => config.paths.templates + file.split(' - ')[0].trim()).join(" ");

                  return new Promise((resolve, reject) => {
                        require('child_process')
                              .exec(`cp ${files} .`, {
                                    cwd: project
                              }, (error, stdout, stderr) => {
                                    if (error) reject(`exec error: ${error}`);                              
                              
                                    setTimeout(() => {
                                          spinner.succeed('Extra files added!');
            
                                          resolve(project);
                                    }, 1500);
                              });
                     });                  
            } else {
                  return project;
            }            
      });
}

function getSeedProject(project) {
      const spinner = ora('Building project...').start();

      return new Promise((resolve, reject) => {
            downloadRepo('brab0/appt-seed', project, function (err) {
                  if(err) reject(err)
                  
                  spinner.succeed('Project built!');

                  resolve(project)
            })
      });
}

function installDependencies(projectsPath) {
   const spinner = ora('Installing dependencies...').start();

   return new Promise((resolve, reject) => {
      require('child_process')
      .exec('npm install', {
         cwd: projectsPath
      }, (error, stdout, stderr) => {
         if (error) reject(`exec error: ${error}`);

         spinner.succeed('Dependencies Installed!');
         
      //    process.stdout.write("\n" + stdout + "\n")
         
         resolve();
      });
   });
}

module.exports = {
   getGitInfo: getGitInfo,
   setPackageJson: setPackageJson,
   getSeedProject: getSeedProject,
   installDependencies: installDependencies,
   checkProjectsRoot: checkProjectsRoot,
   setProjectsRoot: setProjectsRoot,
   addEssentials: addEssentials
}