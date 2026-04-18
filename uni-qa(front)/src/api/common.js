import { request, BASE_URL } from './config'

// 通用接口
export const commonApi = {
  // 获取问题分类列表
  getCategories: () => {
    return request({
      url: '/categories',
      method: 'GET'
    })
  },

 

  // 上传图片（支持单个或多个文件）
  uploadImage: (filePaths, type) => {
    return new Promise((resolve, reject) => {
      const token = uni.getStorageSync('token')
      const uploadTasks = []
      
      // 处理单个文件的情况
      const filesToUpload = Array.isArray(filePaths) ? filePaths : [filePaths]
      
      // 为每个文件创建上传任务
      filesToUpload.forEach((filePath, index) => {
        const task = new Promise((taskResolve, taskReject) => {
          uni.uploadFile({
            url: `${BASE_URL}/upload/image`,
            filePath,
            name: type,
            header: {
              'Authorization': `Bearer ${token}`,
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data)
                if (res.statusCode !== 200) {
                  taskReject(new Error(`上传失败: ${data.message || res.statusCode}`))
                } else {
                  taskResolve(data.data.url)
                }
              } catch (error) {
                taskReject(error)
              }
            },
            fail: (err) => {
              console.error('上传失败:', err)
              taskReject(err)
            }
          })
        })
        uploadTasks.push(task)
      })
      
      // 等待所有上传完成
      Promise.all(uploadTasks)
        .then(urls => {
          // 如果是单个文件，返回单个结果格式
          if (!Array.isArray(filePaths)) {
            resolve({
              code: 200,
              data: urls[0]
            })
          } else {
            // 多个文件返回 urls 数组
            resolve({
              code: 200,
              data: urls
            })
          }
        })
        .catch(error => {
          reject(error)
        })
    })
  }
}

// 统一导出所有API
export * from './user'
export * from './question' 