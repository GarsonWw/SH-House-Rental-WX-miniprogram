# 云端安全与管理员配置

本项目的房源写操作统一由 `houseService` 云函数完成。小程序客户端只读取公开房源，不能直接新增、修改或删除。

## 1. 创建数据库集合

在微信开发者工具的云开发控制台中创建：

- `houses`：房源数据
- `neighborhoods`：小区独立资料
- `admins`：管理员名单
- `favorites`：用户收藏
- `houseViews`：按用户、房源和日期去重的浏览记录

## 2. 部署云函数

分别右键以下目录，选择“上传并部署：云端安装依赖”：

- `cloudfunctions/login`
- `cloudfunctions/houseService`

`seedHouses` 只用于首次导入示例数据，不要重复执行。

## 3. 添加管理员

1. 部署 `houseService` 后进入小程序“我的”页面，点击“房东入口”。
2. 如果当前账号尚未授权，弹窗会显示并允许复制当前微信账号的 `OPENID`。
3. 在 `admins` 集合中新建记录，文档 ID 直接填写该 `OPENID`。
4. 文档内容填写：

```json
{
  "enabled": true,
  "name": "孙先生"
}
```

需要增加协作者时，为对方的 `OPENID` 再创建一条记录即可。禁用账号时把 `enabled` 改为 `false`。

项目当前内置的服务端管理员为 `oA0h43eQhrZqdISgjJctd-hswB_A` 和 `oA0h43Qs4oEFUers_O1EB5aTGLnc`。部署后管理员首次点击“房东入口”时，云函数会自动在 `admins` 集合创建记录。如需停用，请把对应记录的 `enabled` 设置为 `false`。

也可以在 `houseService` 云函数环境变量中设置：

```text
ADMIN_OPENIDS=openid_1,openid_2
```

## 4. 数据库安全规则

在云开发控制台分别设置：

### houses

```json
{
  "read": true,
  "write": false
}
```

### neighborhoods

```json
{
  "read": true,
  "write": false
}
```

### admins

```json
{
  "read": false,
  "write": false
}
```

### houseViews

```json
{
  "read": false,
  "write": false
}
```

### favorites

选择“仅创建者可读写”。收藏记录由微信云数据库自动写入 `_openid`，不同用户相互隔离。

云函数使用服务端身份访问数据库，不受客户端 `write: false` 限制。

## 5. 云存储规则

房源图片和视频由管理员客户端上传。正式发布前，将云存储写权限限制为管理员 `OPENID`，普通用户只保留读取权限。管理员名单变化时同步更新云存储规则。

## 6. 上线验证

使用两个不同微信账号测试：

1. 管理员可以发布、编辑、标记已租和删除房源。
2. 普通用户无法进入发布页，也无法直接写入 `houses` 和 `neighborhoods`。
3. 管理员标记已租后，另一个账号切换页面或重新进入详情时显示“已租”。
4. 两台管理员设备同时编辑同一套房源时，后保存的一方收到“数据已更新，请刷新后重试”。
