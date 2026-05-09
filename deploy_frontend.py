import paramiko, os, time

HOST = '101.132.128.217'
USER = 'root'
PASS = '9sK$7pG&2zR!5tQ#'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)
print('Connected')

def run(cmd):
    print(f'>>> {cmd[:80]}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    code = stdout.channel.recv_exit_status()
    if out: print(out[-300:])
    if err and code != 0: print(f'ERR: {err[-300:]}')
    return out, code

# 1. Install nginx
print('\n=== Nginx ===')
out, _ = run('which nginx')
if not out:
    run('apt-get install -y -qq nginx')

# 2. Change backend port from 80 to 3001
print('\n=== Backend port -> 3001 ===')
run("sed -i 's/listen(80,/listen(3001,/' /opt/milk-card/server/server.js")
run('systemctl restart milk-card')

# 3. Upload frontend files
print('\n=== Upload frontend ===')
sftp = ssh.open_sftp()

skip_dirs = {'server', 'node_modules', '.claude', 'lib', '__pycache__', 'css', 'js'}
# We'll upload everything needed

files_to_upload = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in {'server', 'node_modules', '.claude', 'lib', '__pycache__', '.git'}]
    for f in files:
        if f in ('deploy.py', 'package.json', 'package-lock.json') or f.endswith('.py') or f.endswith('.md'):
            continue
        rel = os.path.join(root, f).replace('\\', '/').lstrip('./')
        files_to_upload.append((os.path.join(root, f), rel))

# Create remote dirs
run('mkdir -p /var/www/milk-card')
remote_dirs = set()
for local, rel in files_to_upload:
    d = os.path.dirname(rel)
    while d:
        remote_dirs.add(d)
        d = os.path.dirname(d)

for d in sorted(remote_dirs):
    try:
        sftp.stat(f'/var/www/milk-card/{d}')
    except FileNotFoundError:
        sftp.mkdir(f'/var/www/milk-card/{d}')

# Upload files
for local, rel in files_to_upload:
    remote = f'/var/www/milk-card/{rel}'
    sftp.put(local, remote)
    print(f'  {rel}')

sftp.close()

# 4. Write nginx config
print('\n=== Nginx config ===')
nginx_conf = """server {
    listen 80;
    server_name _;
    root /var/www/milk-card;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}"""

sftp = ssh.open_sftp()
with sftp.open('/etc/nginx/sites-available/milk-card', 'w') as f:
    f.write(nginx_conf)
sftp.close()

run('ln -sf /etc/nginx/sites-available/milk-card /etc/nginx/sites-enabled/')
run('rm -f /etc/nginx/sites-enabled/default')

# 5. Restart and verify
print('\n=== Restart ===')
run('nginx -t')
run('systemctl restart nginx')
time.sleep(2)

# Verify backend
out, _ = run('curl -s http://localhost:3001/api/health')
# Verify frontend
out, _ = run('curl -s -o /dev/null -w "%{http_code}" http://localhost/')
# Verify proxy
out, _ = run('curl -s http://localhost/api/health')

ssh.close()
print('\n=== DEPLOY COMPLETE ===')
print('Access: http://101.132.128.217')
