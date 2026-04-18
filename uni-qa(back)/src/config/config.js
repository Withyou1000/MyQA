// 配置文件 - 从环境变量读取
module.exports = {
  DBHOST: process.env.DBHOST || '127.0.0.1',
  DBPORT: process.env.DBPORT || 27017,
  DBNAME: process.env.DBNAME || 'myqa',
  secret: process.env.JWT_SECRET || 'jjcyyds',
}
