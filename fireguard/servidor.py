"""Servidor local da demonstração FireGuard.

Igual ao `python -m http.server`, mas manda o navegador NÃO guardar cache:
assim qualquer ajuste nos arquivos aparece na hora, sem precisar de Ctrl+F5.

Uso:  python servidor.py          (porta padrão desta pasta)
      python servidor.py 8080     (outra porta)
"""
import http.server
import os
import sys

PASTA = os.path.dirname(os.path.abspath(__file__))
PORTA_PADRAO = 5501 if os.path.basename(PASTA) == "fireguard-chatbot" else 5500
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else PORTA_PADRAO


class SemCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PASTA, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    inicio = "index.html"
    print(f"FireGuard rodando em http://localhost:{PORTA}/{inicio}")
    print(f"Painel:               http://localhost:{PORTA}/painel.html")
    print("Para encerrar, pressione Ctrl+C.")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORTA), SemCache).serve_forever()
