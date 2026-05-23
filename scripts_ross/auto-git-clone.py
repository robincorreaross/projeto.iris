import os
import sys
import subprocess
import urllib.request
import json

def rodar_comando(comando):
    """Executa o comando no terminal."""
    # Para o clone, não capturamos o output (capture_output=False) 
    # para que, caso o Git peça senha/token, o prompt apareça no terminal.
    resultado = subprocess.run(comando, shell=True)
    if resultado.returncode != 0:
        print(f"\n[ERRO] Falha ao executar: {comando}")
        sys.exit(1)

def obter_repositorios(usuario, token=None):
    """Busca a lista de repositórios do usuário na API do GitHub."""
    # Se NÃO tiver token, busca apenas os públicos do usuário
    url = f"https://api.github.com/users/{usuario}/repos?per_page=100&sort=updated"
    
    # Se TIVER token, busca todos (públicos e privados) do dono do token
    if token:
        url = "https://api.github.com/user/repos?per_page=100&sort=updated"
        
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")
    # O GitHub exige um User-Agent para acessar a API
    req.add_header("User-Agent", "Script-Clone-Python")
    
    if token:
        req.add_header("Authorization", f"token {token}")
        
    try:
        with urllib.request.urlopen(req) as response:
            dados = json.loads(response.read().decode('utf-8'))
            return dados
    except urllib.error.HTTPError as e:
        print(f"\n[ERRO] Falha ao acessar o GitHub. Código: {e.code}")
        if e.code == 404:
            print("Usuário não encontrado.")
        elif e.code == 401:
            print("Token inválido ou não autorizado.")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"\n[ERRO] Falha de conexão: {e.reason}")
        sys.exit(1)

def main():
    print("🚀 Iniciando Automação de Clone do Git...\n")
    
    usuario = input("Digite o seu nome de usuário do GitHub: ").strip()
    if not usuario:
        print("[ERRO] O nome de usuário é obrigatório.")
        sys.exit(1)
        
    print("\n[Opcional] Para listar repositórios PRIVADOS, é necessário um Token.")
    token = input("Cole seu Token (ou aperte Enter para listar apenas os PÚBLICOS): ").strip()
    
    print("\n🔄 Buscando repositórios na nuvem...")
    repos = obter_repositorios(usuario, token if token else None)
    
    if not repos:
        print("Nenhum repositório encontrado para este usuário.")
        sys.exit(0)
        
    print("\n📦 Repositórios encontrados (ordenados por atualização mais recente):")
    # Lista os repositórios numerados
    for i, repo in enumerate(repos):
        nome = repo.get("name")
        privado = "🔒 Privado" if repo.get("private") else "🌐 Público"
        print(f"[{i + 1}] {nome} ({privado})")
        
    escolha = input("\nDigite o número do projeto que deseja clonar (ou 0 para cancelar): ").strip()
    
    if not escolha.isdigit():
        print("[ERRO] Entrada inválida. Digite um número inteiro.")
        sys.exit(1)
        
    indice = int(escolha) - 1
    
    if indice == -1:
        print("Operação cancelada.")
        sys.exit(0)
        
    if indice < 0 or indice >= len(repos):
        print("[ERRO] Número fora da lista. Tente novamente.")
        sys.exit(1)
        
    # Pega os dados do repositório escolhido
    repo_escolhido = repos[indice]
    url_clone = repo_escolhido.get("clone_url")
    nome_repo = repo_escolhido.get("name")
    
    # Verifica se a pasta já existe para não dar erro no git clone
    if os.path.exists(nome_repo):
        print(f"\n[!] A pasta '{nome_repo}' já existe no diretório atual.")
        sys.exit(1)
        
    print(f"\n🚀 Clonando '{nome_repo}'...")
    rodar_comando(f"git clone {url_clone}")
    
    print(f"\n✅ Repositório '{nome_repo}' clonado com sucesso!")

if __name__ == "__main__":
    main()