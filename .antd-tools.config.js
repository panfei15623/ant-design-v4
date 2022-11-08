const fs = require('fs');
const path = require('path');
const defaultVars = require('./scripts/default-vars');
const darkVars = require('./scripts/dark-vars');
const compactVars = require('./scripts/compact-vars');

function generateThemeFileContent(theme) {
  return `const { ${theme}ThemeSingle } = require('./theme');\nconst defaultTheme = require('./default-theme');\n
module.exports = {
  ...defaultTheme,
  ...${theme}ThemeSingle
}`;
}

// We need compile additional content for antd user
// 将 components/**/style/index-pure.less 写进 lib/style/components.less，es 中为什么没写？ // TODO
function finalizeCompile() {
  if (fs.existsSync(path.join(__dirname, './lib'))) {
    // Build a entry less file to dist/antd.less
    const componentsPath = path.join(process.cwd(), 'components');
    let componentsLessContent = '';
    // Build components in one file: lib/style/components.less
    fs.readdir(componentsPath, (err, files) => {
      files.forEach(file => {
        if (fs.existsSync(path.join(componentsPath, file, 'style', 'index.less'))) {
          componentsLessContent += `@import "../${path.posix.join(
            file,
            'style',
            'index-pure.less',
          )}";\n`;
        }
      });
      fs.writeFileSync(
        path.join(process.cwd(), 'lib', 'style', 'components.less'),
        componentsLessContent,
      );
    });
  }
}

/**
 * BuildThemeFile
 *
 * @param {any} theme 主题名
 * @param {any} vars Less 变量
 * @returns
 */
function buildThemeFile(theme, vars) {
  // Build less entry file: dist/antd.${theme}.less
  if (theme !== 'default') {
    fs.writeFileSync(
      path.join(process.cwd(), 'dist', `antd.${theme}.less`),
      `@import "../lib/style/${theme}.less";\n@import "../lib/style/components.less";`,
    );
    // eslint-disable-next-line no-console
    console.log(`Built a entry less file to dist/antd.${theme}.less`);
  } else {
    fs.writeFileSync(
      path.join(process.cwd(), 'dist', `default-theme.js`),
      `module.exports = ${JSON.stringify(vars, null, 2)};\n`,
    );
    return;
  }

  // Build ${theme}.js: dist/${theme}-theme.js, for less-loader

  fs.writeFileSync(
    path.join(process.cwd(), 'dist', `theme.js`),
    `const ${theme}ThemeSingle = ${JSON.stringify(vars, null, 2)};\n`,
    {
      flag: 'a',
    },
  );

  fs.writeFileSync(
    path.join(process.cwd(), 'dist', `${theme}-theme.js`),
    generateThemeFileContent(theme),
  );

  // eslint-disable-next-line no-console
  console.log(`Built a ${theme} theme js file to dist/${theme}-theme.js`);
}

function finalizeDist() {
  if (fs.existsSync(path.join(__dirname, './dist'))) {
    // Build less entry file: dist/antd.less
    fs.writeFileSync(
      path.join(process.cwd(), 'dist', 'antd.less'),
      '@import "../lib/style/default.less";\n@import "../lib/style/components.less";',
    );
    // eslint-disable-next-line no-console
    // 构建 theme.js 文件
    fs.writeFileSync(
      path.join(process.cwd(), 'dist', 'theme.js'),
      `const defaultTheme = require('./default-theme.js');\n`,
    );
    // eslint-disable-next-line no-console
    console.log('Built a entry less file to dist/antd.less');
    buildThemeFile('default', defaultVars);
    buildThemeFile('dark', darkVars);
    buildThemeFile('compact', compactVars);
    buildThemeFile('variable', {});
    fs.writeFileSync(
      path.join(process.cwd(), 'dist', `theme.js`),
      `
function getThemeVariables(options = {}) {
  let themeVar = {
    'hack': \`true;@import "\${require.resolve('antd/lib/style/color/colorPalette.less')}";\`,
    ...defaultTheme
  };
  if(options.dark) {
    themeVar = {
      ...themeVar,
      ...darkThemeSingle
    }
  }
  if(options.compact){
    themeVar = {
      ...themeVar,
      ...compactThemeSingle
    }
  }
  return themeVar;
}

module.exports = {
  darkThemeSingle,
  compactThemeSingle,
  getThemeVariables
}`,
      {
        flag: 'a',
      },
    );
  }
}

function isComponentStyleEntry(file) {
  return file.path.match(/style(\/|\\)index\.tsx/);
}

function needTransformStyle(content) {
  return content.includes('../../style/index.less') || content.includes('./index.less');
}

module.exports = {
  compile: {
    includeLessFile: [/(\/|\\)components(\/|\\)style(\/|\\)default.less$/],
    transformTSFile(file) {
      // 将 components/**/style/index.tsx 中的 '../../style/index.less' 转换成 '../../style/default.less'
      // 实际是替换旧的写法
      if (isComponentStyleEntry(file)) {
        let content = file.contents.toString();

        if (needTransformStyle(content)) {
          const cloneFile = file.clone();

          // Origin
          content = content.replace('../../style/index.less', '../../style/default.less');
          cloneFile.contents = Buffer.from(content);

          return cloneFile;
        }
      }
    },
    transformFile(file) {
      // 1. 将 components/**/style/index.less 内容复制到 index-pure.less
      // 2. 重写 components/**/style/index.less 为 '@root-entry-name: default;' "@import './index-pure.less';"
      // 3. 输出到 libDir 或 esDir
      if (isComponentStyleEntry(file)) {
        // 获取 indexLessFilePath 路径
        const indexLessFilePath = file.path.replace('index.tsx', 'index.less');

        if (fs.existsSync(indexLessFilePath)) {
          // We put origin `index.less` file to `index-pure.less`
          const pureFile = file.clone();
          pureFile.contents = Buffer.from(fs.readFileSync(indexLessFilePath, 'utf8')); // 设置 pureFile 为 indexLessFile 内容
          pureFile.path = pureFile.path.replace('index.tsx', 'index-pure.less'); // 生成 style/index-pure.less

          // Rewrite `index.less` file with `root-entry-name`
          const indexLessFile = file.clone();
          indexLessFile.contents = Buffer.from(
            [
              // Inject variable
              '@root-entry-name: default;',
              // Point to origin file
              "@import './index-pure.less';",
            ].join('\n\n'),
          );
          indexLessFile.path = indexLessFile.path.replace('index.tsx', 'index.less');

          return [indexLessFile, pureFile];
        }
      }

      return [];
    },
    lessConfig: {
      modifyVars: {
        'root-entry-name': 'default',
      },
    },
    finalize: finalizeCompile,
  },
  dist: {
    finalize: finalizeDist,
  },
  generateThemeFileContent,
  bail: true,
};
