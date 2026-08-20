import subprocess
import time
import sys

def run_tunnel():
    cmd = ["npx", "--yes", "localtunnel", "--port", "3000", "--local-host", "127.0.0.1", "--subdomain", "aiadam"]
    print("Avvio tunnel persistente per https://aiadam.loca.lt ...")
    while True:
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            for line in p.stdout:
                print(line, end="")
                sys.stdout.flush()
            p.wait()
            print("Tunnel interrotto, riavvio in 3 secondi...")
            time.sleep(3)
        except Exception as e:
            print(f"Errore nel tunnel: {e}, riprovo tra 3 secondi...")
            time.sleep(3)

if __name__ == "__main__":
    run_tunnel()
