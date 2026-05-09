#!/bin/bash
cd /opt/milk-card/repo

# 拉取最新代码
git pull origin main

# 同步前端到 nginx 目录
rsync -a --delete --exclude='server' --exclude='node_modules' --exclude='.git' --exclude='*.py' --exclude='.claude' /opt/milk-card/repo/ /var/www/milk-card/
# 删除不需要的文件
rm -f /var/www/milk-card/deploy*.py /var/www/milk-card/deploy*.sh /var/www/milk-card/.gitignore /var/www/milk-card/assets/design-philosophy.md

# 同步后端（保留 node_modules）
cp -f /opt/milk-card/repo/server/server.js /opt/milk-card/server/server.js
cp -f /opt/milk-card/repo/server/auth.js /opt/milk-card/server/auth.js
cp -f /opt/milk-card/repo/server/todos.js /opt/milk-card/server/todos.js
cp -f /opt/milk-card/repo/server/db.js /opt/milk-card/server/db.js

# 修正端口为 3001
sed -i 's/process.env.PORT || 3000/3001/' /opt/milk-card/server/server.js

# 重启后端服务
systemctl restart milk-card

echo "Deploy done: $(date)"
