'use strict';
const _url = require('url');
const _path = require('path');
const _fs = require('fs');
const _ts = require('typescript');

//根据实际路径获取文件内容
const getCompileContent = (cli, realFilePath, data, compileOptions,cb)=>{
  let work = cli.cwd();
  if(!_fs.existsSync(realFilePath)){
    return cb(null, null)
  }
  let fileContent = _fs.readFileSync(realFilePath, {encoding: 'utf8'})
  try{
    let source = _ts.transpileModule(fileContent, compileOptions)
    data.status = 200
    cb(null, source.outputText)
  }catch(e){
    cb(e)
  }
}

exports.registerPlugin = function(cli, options){

  let tsconfig = require(_path.join(cli.cwd(), "tsconfig.json"))

  cli.registerHook('route:didRequest', (req, data, content, cb)=>{

    //如果不需要编译
    if(!/\.js$/.test(req.path)){
      return cb(null, content)
    }
    let fakeFilePath = _path.join(cli.cwd(), req.path);
    //替换路径为less
    let realFilePath = fakeFilePath.replace(/(js)$/,'ts')

    getCompileContent(cli, realFilePath, data, tsconfig, (error, compileContent)=>{
      if(error){return cb(error)};
      if(compileContent){
        content = compileContent
      }
      //交给下一个处理器
      cb(null, content)
    })
  })

  cli.registerHook('build:doCompile', (buildConfig, data, content, cb)=>{
    let inputFilePath = data.inputFilePath;
    if(!/(\.ts)$/.test(inputFilePath)){
      return cb(null, content)
    }

    getCompileContent(cli, inputFilePath, data, tsconfig, (error, content)=>{
      if(error){return cb(error)};
      if(data.status == 200){
        data.outputFilePath = data.outputFilePath.replace(/(\.ts)$/, ".js");
        data.outputFileRelativePath = data.outputFileRelativePath.replace(/(\.ts)$/, ".js")
      }
      cb(null, content);
    })
  })
}