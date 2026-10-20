import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk
import os
import sys
import argparse

# ─── Extensions d'images supportées ───────────────────────────────────────────
EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp"}
DELAI_DEFAUT = 4000  # millisecondes entre chaque photo


class Slideshow:
    def __init__(self, root, repertoire, delai=DELAI_DEFAUT):
        self.root = root
        self.delai = delai
        self.index = 0
        self.en_pause = False
        self.job = None
        self.plein_ecran = True

        # Charger la liste des photos
        self.photos = sorted([
            os.path.join(repertoire, f)
            for f in os.listdir(repertoire)
            if os.path.splitext(f)[1].lower() in EXTENSIONS
        ])

        if not self.photos:
            messagebox.showerror("Erreur", f"Aucune photo trouvée dans :\n{repertoire}")
            root.destroy()
            return

        # ─── Configuration de la fenêtre ───────────────────────────────────────
        self.root.title("Slideshow")
        self.root.configure(bg="#0a0a0a")
        self.root.attributes("-fullscreen", True)
        self.root.bind("<Escape>", self.quitter)
        self.root.bind("<F11>", self.basculer_plein_ecran)
        self.root.bind("<space>", self.pause_reprendre)
        self.root.bind("<Left>", self.precedente)
        self.root.bind("<Right>", self.suivante)
        self.root.bind("q", self.quitter)

        # ─── Zone image ────────────────────────────────────────────────────────
        self.canvas = tk.Canvas(
            self.root, bg="#0a0a0a", highlightthickness=0, cursor="none"
        )
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # ─── Barre de contrôle (apparaît au survol) ────────────────────────────
        self.barre = tk.Frame(self.root, bg="#1a1a1a", height=60)
        self.barre.place(relx=0, rely=1.0, relwidth=1.0, anchor="sw")

        style_btn = dict(
            bg="#1a1a1a", fg="#e0e0e0", relief="flat",
            font=("Helvetica", 18), padx=14, pady=6,
            activebackground="#333333", activeforeground="#ffffff", cursor="hand2"
        )

        self.btn_prec = tk.Button(self.barre, text="◀", command=lambda: self.precedente(None), **style_btn)
        self.btn_prec.pack(side=tk.LEFT, padx=4, pady=8)

        self.btn_pause = tk.Button(self.barre, text="⏸", command=lambda: self.pause_reprendre(None), **style_btn)
        self.btn_pause.pack(side=tk.LEFT, padx=4, pady=8)

        self.btn_suiv = tk.Button(self.barre, text="▶", command=lambda: self.suivante(None), **style_btn)
        self.btn_suiv.pack(side=tk.LEFT, padx=4, pady=8)

        # Compteur
        self.lbl_compteur = tk.Label(
            self.barre, text="", bg="#1a1a1a", fg="#888888",
            font=("Helvetica", 12)
        )
        self.lbl_compteur.pack(side=tk.LEFT, padx=16)

        # Nom du fichier
        self.lbl_nom = tk.Label(
            self.barre, text="", bg="#1a1a1a", fg="#cccccc",
            font=("Helvetica", 12), anchor="w"
        )
        self.lbl_nom.pack(side=tk.LEFT, padx=4, fill=tk.X, expand=True)

        # Bouton quitter (style séparé pour éviter le conflit sur 'fg')
        style_btn_quitter = dict(
            bg="#1a1a1a", fg="#ff5555", relief="flat",
            font=("Helvetica", 18), padx=14, pady=6,
            activebackground="#333333", activeforeground="#ff3333", cursor="hand2"
        )
        self.btn_quitter = tk.Button(
            self.barre, text="✕", command=self.quitter, **style_btn_quitter
        )
        self.btn_quitter.pack(side=tk.RIGHT, padx=8, pady=8)

        # ─── Gestion survol souris ─────────────────────────────────────────────
        self.barre_visible = False
        self.timer_barre = None
        self.root.bind("<Motion>", self.sur_mouvement_souris)

        # ─── Lancer ────────────────────────────────────────────────────────────
        self.afficher_photo()

    # ──────────────────────────────────────────────────────────────────────────
    def afficher_photo(self):
        chemin = self.photos[self.index]
        largeur = self.root.winfo_width() or self.root.winfo_screenwidth()
        hauteur = self.root.winfo_height() or self.root.winfo_screenheight()

        try:
            img = Image.open(chemin)
            img.thumbnail((largeur, hauteur), Image.LANCZOS)
        except Exception as e:
            print(f"Erreur chargement {chemin}: {e}")
            self.suivante(None)
            return

        self.tk_img = ImageTk.PhotoImage(img)
        self.canvas.delete("all")

        # Fond noir + image centrée
        cx = largeur // 2
        cy = hauteur // 2
        self.canvas.create_image(cx, cy, anchor=tk.CENTER, image=self.tk_img)

        # Numéro + nom dans le canvas (discret, coin bas gauche)
        nom = os.path.basename(chemin)
        self.lbl_compteur.config(text=f"{self.index + 1} / {len(self.photos)}")
        self.lbl_nom.config(text=nom)

        # Planifier la suivante
        if not self.en_pause:
            self.job = self.root.after(self.delai, self.avancer)

    def avancer(self):
        self.index = (self.index + 1) % len(self.photos)
        self.afficher_photo()

    def suivante(self, event):
        if self.job:
            self.root.after_cancel(self.job)
        self.index = (self.index + 1) % len(self.photos)
        self.afficher_photo()

    def precedente(self, event):
        if self.job:
            self.root.after_cancel(self.job)
        self.index = (self.index - 1) % len(self.photos)
        self.afficher_photo()

    def pause_reprendre(self, event):
        self.en_pause = not self.en_pause
        self.btn_pause.config(text="▶" if self.en_pause else "⏸")
        if not self.en_pause:
            self.job = self.root.after(self.delai, self.avancer)
        elif self.job:
            self.root.after_cancel(self.job)

    def basculer_plein_ecran(self, event):
        self.plein_ecran = not self.plein_ecran
        self.root.attributes("-fullscreen", self.plein_ecran)

    def sur_mouvement_souris(self, event):
        # Afficher la barre et masquer le curseur après 2s d'inactivité
        self.canvas.config(cursor="arrow")
        if not self.barre_visible:
            self.barre.lift()
            self.barre_visible = True
        if self.timer_barre:
            self.root.after_cancel(self.timer_barre)
        self.timer_barre = self.root.after(2500, self.masquer_barre)

    def masquer_barre(self):
        self.barre.lower()
        self.barre_visible = False
        self.canvas.config(cursor="none")

    def quitter(self, event=None):
        self.root.destroy()


# ─── Point d'entrée ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Slideshow de photos")
    parser.add_argument("repertoire", help="Répertoire contenant les photos")
    parser.add_argument(
        "--delai", type=int, default=4,
        help="Délai entre chaque photo en secondes (défaut : 4)"
    )
    args = parser.parse_args()

    if not os.path.isdir(args.repertoire):
        print(f"Erreur : le répertoire '{args.repertoire}' n'existe pas.")
        sys.exit(1)

    root = tk.Tk()
    app = Slideshow(root, args.repertoire, delai=args.delai * 1000)
    root.mainloop()
