import tkinter as tk
from tkinter import filedialog, messagebox, ttk, scrolledtext
import subprocess
import os
import json
import re
import threading

FFMPEG_PATH = r"C:\Program Files\Ffmpeg-8.0\bin\ffmpeg.exe"
FFPROBE_PATH = r"C:\Program Files\Ffmpeg-8.0\bin\ffprobe.exe"

class VideoStudioProApp:
    def _init_(self, root):
        self.root = root
        self.root.title("🎬 Studio FFmpeg Pro")
        self.root.geometry("900x750")
        self.root.resizable(True, False)

        self.file_path = ""
        self.output_path = ""
        self.file_list = []
        self.video_info = {}
        
        self.treatment = tk.StringVar()
        self.video_format = tk.StringVar(value="mp4")
        self.audio_format = tk.StringVar(value="mp3")
        self.audio_codec = tk.StringVar(value="aac")
        self.video_codec = tk.StringVar(value="libx264")
        self.start_time = tk.StringVar()
        self.end_time = tk.StringVar()
        self.width = tk.StringVar(value="1920")
        self.height = tk.StringVar(value="1080")
        self.rotation = tk.StringVar(value="0")
        self.crf = tk.StringVar(value="23")
        self.volume = tk.StringVar(value="1.0")
        self.subtitle_path = tk.StringVar()
        self.output_dir = tk.StringVar()
        self.frame_time = tk.StringVar(value="00:00:01")
        self.frame_interval = tk.StringVar(value="1")

        self.processing = False
        self.build_ui()

    def build_ui(self):
        # Frame principal avec scrollbar
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)

        # === SECTION FICHIER ===
        file_frame = tk.LabelFrame(main_frame, text="📁 Fichier(s) source", font=("Arial", 11, "bold"))
        file_frame.pack(fill="x", pady=5)

        btn_frame = tk.Frame(file_frame)
        btn_frame.pack(pady=5)
        tk.Button(btn_frame, text="📂 Fichier unique", command=self.select_file, width=15).pack(side="left", padx=5)
        tk.Button(btn_frame, text="📚 Fichiers multiples", command=self.select_multiple_files, width=18).pack(side="left", padx=5)
        tk.Button(btn_frame, text="🗑 Effacer", command=self.clear_files, width=10).pack(side="left", padx=5)

        self.file_label = tk.Label(file_frame, text="Aucun fichier sélectionné", fg="gray")
        self.file_label.pack(pady=5)

        # Info vidéo
        self.info_text = tk.Text(file_frame, height=4, width=80, state="disabled", bg="#f0f0f0")
        self.info_text.pack(pady=5, padx=10)

        # === SECTION TRAITEMENT ===
        treatment_frame = tk.LabelFrame(main_frame, text="🛠 Traitement", font=("Arial", 11, "bold"))
        treatment_frame.pack(fill="x", pady=5)

        treatments = [
            "Convertir format vidéo",
            "Découper extrait",
            "Extraire audio",
            "Convertir format + codec audio",
            "Compresser vidéo (qualité)",
            "Redimensionner",
            "Rotation",
            "Fusionner vidéos",
            "Ajouter sous-titres",
            "Extraire images",
            "Ajuster volume audio"
        ]

        # Grid pour les radio buttons
        radio_frame = tk.Frame(treatment_frame)
        radio_frame.pack(pady=5)
        
        for i, opt in enumerate(treatments):
            row = i // 3
            col = i % 3
            tk.Radiobutton(radio_frame, text=opt, variable=self.treatment, value=opt, 
                          command=self.show_options).grid(row=row, column=col, sticky="w", padx=10, pady=2)

        # === SECTION OPTIONS ===
        self.options_frame = tk.LabelFrame(main_frame, text="⚙ Options", font=("Arial", 11, "bold"))
        self.options_frame.pack(fill="x", pady=5)

        self.options_content = tk.Frame(self.options_frame)
        self.options_content.pack(pady=10, padx=10)

        # === SECTION SORTIE ===
        output_frame = tk.LabelFrame(main_frame, text="💾 Dossier de sortie", font=("Arial", 11, "bold"))
        output_frame.pack(fill="x", pady=5)

        out_btn_frame = tk.Frame(output_frame)
        out_btn_frame.pack(pady=5)
        tk.Button(out_btn_frame, text="📁 Choisir dossier", command=self.select_output_dir).pack(side="left", padx=5)
        self.output_label = tk.Label(out_btn_frame, text="(même dossier que source par défaut)", fg="gray")
        self.output_label.pack(side="left", padx=5)

        # === SECTION PROGRESSION ===
        progress_frame = tk.Frame(main_frame)
        progress_frame.pack(fill="x", pady=5)

        self.progress_bar = ttk.Progressbar(progress_frame, mode='determinate', length=400)
        self.progress_bar.pack(pady=5)
        
        self.progress_label = tk.Label(progress_frame, text="", fg="blue")
        self.progress_label.pack()

        # === BOUTON LANCER ===
        tk.Button(main_frame, text="🚀 LANCER LE TRAITEMENT", command=self.run_ffmpeg, 
                 font=("Arial", 12, "bold"), bg="#4CAF50", fg="white", height=2).pack(pady=10)

        # === LOGS ===
        log_frame = tk.LabelFrame(main_frame, text="📋 Logs", font=("Arial", 10, "bold"))
        log_frame.pack(fill="both", expand=True, pady=5)

        self.log_text = scrolledtext.ScrolledText(log_frame, height=8, state="disabled", bg="#1e1e1e", fg="#00ff00")
        self.log_text.pack(fill="both", expand=True, padx=5, pady=5)

    def log(self, message):
        self.log_text.config(state="normal")
        self.log_text.insert("end", f"{message}\n")
        self.log_text.see("end")
        self.log_text.config(state="disabled")

    def select_file(self):
        self.file_path = filedialog.askopenfilename(
            title="Choisir une vidéo",
            filetypes=[("Fichiers vidéo", "*.mp4 *.avi *.mkv *.mov *.flv *.wmv")]
        )
        if self.file_path:
            self.file_list = [self.file_path]
            # IMPORTANT: ajouter un suffixe pour éviter d'écraser l'original
            base = os.path.splitext(self.file_path)[0]
            self.output_path = f"{base}_converted"
            self.file_label.config(text=f"✅ {os.path.basename(self.file_path)}", fg="green")
            self.get_video_info()
            self.log(f"Fichier sélectionné: {self.file_path}")

    def select_multiple_files(self):
        files = filedialog.askopenfilenames(
            title="Choisir plusieurs vidéos",
            filetypes=[("Fichiers vidéo", "*.mp4 *.avi *.mkv *.mov *.flv *.wmv")]
        )
        if files:
            self.file_list = list(files)
            self.file_path = self.file_list[0]
            self.file_label.config(text=f"✅ {len(files)} fichier(s) sélectionné(s)", fg="green")
            self.log(f"{len(files)} fichiers sélectionnés")

    def clear_files(self):
        self.file_list = []
        self.file_path = ""
        self.video_info = {}
        self.file_label.config(text="Aucun fichier sélectionné", fg="gray")
        self.info_text.config(state="normal")
        self.info_text.delete("1.0", "end")
        self.info_text.config(state="disabled")
        self.log("Fichiers effacés")

    def select_output_dir(self):
        directory = filedialog.askdirectory(title="Choisir le dossier de sortie")
        if directory:
            self.output_dir.set(directory)
            self.output_label.config(text=f"📁 {directory}", fg="blue")
            self.log(f"Dossier de sortie: {directory}")

    def get_video_info(self):
        if not self.file_path:
            return
            
        if not os.path.exists(FFPROBE_PATH):
            self.log(f"⚠ FFprobe introuvable: {FFPROBE_PATH}")
            return

        try:
            cmd = f'"{FFPROBE_PATH}" -v quiet -print_format json -show_format -show_streams "{self.file_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if not result.stdout:
                self.log("⚠ FFprobe n'a rien retourné")
                return
                
            data = json.loads(result.stdout)

            video_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), None)
            audio_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), None)
            format_data = data.get("format", {})

            if video_stream:
                duration = float(format_data.get("duration", 0))
                minutes, seconds = divmod(int(duration), 60)
                hours, minutes = divmod(minutes, 60)

                info = f"Résolution: {video_stream.get('width', '?')}x{video_stream.get('height', '?')} | "
                info += f"Codec vidéo: {video_stream.get('codec_name', '?')} | "
                info += f"Durée: {hours:02d}:{minutes:02d}:{seconds:02d}\n"
                info += f"Codec audio: {audio_stream.get('codec_name', '?') if audio_stream else 'Aucun'} | "
                info += f"Taille: {int(format_data.get('size', 0)) / (1024*1024):.2f} MB"

                self.info_text.config(state="normal")
                self.info_text.delete("1.0", "end")
                self.info_text.insert("1.0", info)
                self.info_text.config(state="disabled")

                self.video_info = {"duration": duration, "width": video_stream.get('width'), "height": video_stream.get('height')}
        except Exception as e:
            self.log(f"Erreur lors de la lecture des infos: {e}")

    def show_options(self):
        for widget in self.options_content.winfo_children():
            widget.destroy()

        choice = self.treatment.get()

        if choice == "Convertir format vidéo":
            tk.Label(self.options_content, text="Format vidéo:").grid(row=0, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.video_format, "mp4", "avi", "mkv", "mov", "flv", "webm").grid(row=0, column=1, padx=5)
            tk.Label(self.options_content, text="Codec vidéo:").grid(row=1, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.video_codec, "copy", "libx264", "libx265", "libvpx-vp9").grid(row=1, column=1, padx=5)

        elif choice == "Découper extrait":
            tk.Label(self.options_content, text="Début (HH:MM:SS):").grid(row=0, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.start_time, width=15).grid(row=0, column=1, padx=5)
            tk.Label(self.options_content, text="Fin (HH:MM:SS):").grid(row=1, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.end_time, width=15).grid(row=1, column=1, padx=5)

        elif choice == "Extraire audio":
            tk.Label(self.options_content, text="Format audio:").grid(row=0, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.audio_format, "mp3", "wav", "aac", "flac", "ogg").grid(row=0, column=1, padx=5)

        elif choice == "Convertir format + codec audio":
            tk.Label(self.options_content, text="Format vidéo:").grid(row=0, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.video_format, "mp4", "avi", "mkv", "mov").grid(row=0, column=1, padx=5)
            tk.Label(self.options_content, text="Codec audio:").grid(row=1, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.audio_codec, "aac", "libmp3lame", "ac3", "opus", "vorbis", "flac").grid(row=1, column=1, padx=5)

        elif choice == "Compresser vidéo (qualité)":
            tk.Label(self.options_content, text="CRF (18-28, plus bas = meilleur):").grid(row=0, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.crf, width=10).grid(row=0, column=1, padx=5)
            tk.Label(self.options_content, text="Format:").grid(row=1, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.video_format, "mp4", "mkv").grid(row=1, column=1, padx=5)

        elif choice == "Redimensionner":
            tk.Label(self.options_content, text="Largeur:").grid(row=0, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.width, width=10).grid(row=0, column=1, padx=5)
            tk.Label(self.options_content, text="Hauteur:").grid(row=1, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.height, width=10).grid(row=1, column=1, padx=5)
            tk.Button(self.options_content, text="720p", command=lambda: self.set_resolution(1280, 720)).grid(row=0, column=2, padx=5)
            tk.Button(self.options_content, text="1080p", command=lambda: self.set_resolution(1920, 1080)).grid(row=1, column=2, padx=5)

        elif choice == "Rotation":
            tk.Label(self.options_content, text="Angle:").grid(row=0, column=0, sticky="w", padx=5)
            tk.OptionMenu(self.options_content, self.rotation, "90", "180", "270").grid(row=0, column=1, padx=5)

        elif choice == "Fusionner vidéos":
            tk.Label(self.options_content, text="Sélectionnez plusieurs fichiers via 'Fichiers multiples'").pack()

        elif choice == "Ajouter sous-titres":
            tk.Label(self.options_content, text="Fichier .srt:").grid(row=0, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.subtitle_path, width=30).grid(row=0, column=1, padx=5)
            tk.Button(self.options_content, text="...", command=self.select_subtitle).grid(row=0, column=2, padx=5)

        elif choice == "Extraire images":
            tk.Label(self.options_content, text="Mode:").grid(row=0, column=0, sticky="w", padx=5)
            mode = tk.StringVar(value="time")
            tk.Radiobutton(self.options_content, text="À un temps précis", variable=mode, value="time").grid(row=0, column=1, sticky="w")
            tk.Radiobutton(self.options_content, text="Toutes les X secondes", variable=mode, value="interval").grid(row=1, column=1, sticky="w")
            self.extract_mode = mode
            tk.Label(self.options_content, text="Temps (HH:MM:SS):").grid(row=2, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.frame_time, width=15).grid(row=2, column=1, padx=5)
            tk.Label(self.options_content, text="Intervalle (secondes):").grid(row=3, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.frame_interval, width=15).grid(row=3, column=1, padx=5)

        elif choice == "Ajuster volume audio":
            tk.Label(self.options_content, text="Volume (0.5=50%, 2.0=200%):").grid(row=0, column=0, sticky="w", padx=5)
            tk.Entry(self.options_content, textvariable=self.volume, width=10).grid(row=0, column=1, padx=5)

    def set_resolution(self, w, h):
        self.width.set(str(w))
        self.height.set(str(h))

    def select_subtitle(self):
        path = filedialog.askopenfilename(title="Choisir un fichier .srt", filetypes=[("Sous-titres", "*.srt")])
        if path:
            self.subtitle_path.set(path)

    def get_output_file(self, base_name, extension):
        # Nettoyer le nom de fichier des caractères problématiques
        base_name = base_name.replace("'", "").replace('"', '').replace(':', '-')
        
        if self.output_dir.get():
            return os.path.join(self.output_dir.get(), f"{base_name}.{extension}")
        else:
            return f"{self.output_path}.{extension}"

    def run_ffmpeg(self):
        if not self.file_list:
            messagebox.showerror("Erreur", "Aucun fichier sélectionné.")
            return

        if self.processing:
            messagebox.showwarning("En cours", "Un traitement est déjà en cours.")
            return

        treatment = self.treatment.get()
        if not treatment:
            messagebox.showerror("Erreur", "Aucun traitement sélectionné.")
            return

        self.processing = True
        self.progress_bar['value'] = 0
        self.progress_label.config(text="Traitement en cours...")
        
        thread = threading.Thread(target=self.process_video)
        thread.start()

    def process_video(self):
        try:
            treatment = self.treatment.get()
            input_file = self.file_path
            base_name = os.path.splitext(os.path.basename(input_file))[0]
            # Nettoyer le nom de base des caractères problématiques
            base_name = base_name.replace("'", "").replace('"', '').replace(':', '-')
            cmd = ""
            output_file = ""  # IMPORTANT: initialiser ici

            if treatment == "Convertir format vidéo":
                ext = self.video_format.get()
                codec = self.video_codec.get()
                output_file = self.get_output_file(f"{base_name}_converted", ext)
                
                # Vérifier qu'on n'écrase pas l'original
                if os.path.abspath(input_file) == os.path.abspath(output_file):
                    output_file = self.get_output_file(f"{base_name}_converted_new", ext)
                    self.log(f"⚠ Ajout de suffixe pour éviter d'écraser l'original")
                
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -c:v {codec} -c:a copy "{output_file}"'

            elif treatment == "Découper extrait":
                start = self.start_time.get()
                end = self.end_time.get()
                output_file = self.get_output_file(f"{base_name}_cut", "mp4")
                cmd = f'"{FFMPEG_PATH}" -ss {start} -to {end} -i "{input_file}" -c copy "{output_file}"'

            elif treatment == "Extraire audio":
                ext = self.audio_format.get()
                output_file = self.get_output_file(f"{base_name}_audio", ext)
                codec_map = {"mp3": "libmp3lame", "aac": "aac", "wav": "pcm_s16le", "flac": "flac", "ogg": "libvorbis"}
                codec = codec_map.get(ext, "copy")
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -vn -acodec {codec} "{output_file}"'

            elif treatment == "Convertir format + codec audio":
                ext = self.video_format.get()
                codec_audio = self.audio_codec.get()
                output_file = self.get_output_file(f"{base_name}_reencoded", ext)
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -c:v copy -c:a {codec_audio} "{output_file}"'

            elif treatment == "Compresser vidéo (qualité)":
                crf_val = self.crf.get()
                ext = self.video_format.get()
                output_file = self.get_output_file(f"{base_name}_compressed", ext)
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -c:v libx264 -crf {crf_val} -preset medium -c:a aac "{output_file}"'

            elif treatment == "Redimensionner":
                w = self.width.get()
                h = self.height.get()
                output_file = self.get_output_file(f"{base_name}_{w}x{h}", "mp4")
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -vf scale={w}:{h} -c:a copy "{output_file}"'

            elif treatment == "Rotation":
                angle = self.rotation.get()
                transpose_map = {"90": "1", "180": "2,transpose=2", "270": "2"}
                output_file = self.get_output_file(f"{base_name}_rotate{angle}", "mp4")
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -vf "transpose={transpose_map[angle]}" -c:a copy "{output_file}"'

            elif treatment == "Fusionner vidéos":
                if len(self.file_list) < 2:
                    self.root.after(0, lambda: messagebox.showerror("Erreur", "Il faut au moins 2 fichiers."))
                    return

                concat_file = "concat_list.txt"
                with open(concat_file, "w") as f:
                    for file in self.file_list:
                        f.write(f"file '{file}'\n")
                
                output_file = self.get_output_file("merged_video", "mp4")
                cmd = f'"{FFMPEG_PATH}" -f concat -safe 0 -i {concat_file} -c copy "{output_file}"'

            elif treatment == "Ajouter sous-titres":
                srt_path = self.subtitle_path.get()
                if not srt_path:
                    self.root.after(0, lambda: messagebox.showerror("Erreur", "Fichier .srt manquant."))
                    return
                output_file = self.get_output_file(f"{base_name}_subtitled", "mp4")
                srt_path_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -vf "subtitles={srt_path_escaped}" -c:a copy "{output_file}"'

            elif treatment == "Extraire images":
                mode = self.extract_mode.get()
                output_dir = self.output_dir.get() if self.output_dir.get() else os.path.dirname(input_file)
                output_pattern = os.path.join(output_dir, f"{base_name}frame%04d.png")
                output_file = output_pattern  # Pour le log
                
                if mode == "time":
                    time = self.frame_time.get()
                    cmd = f'"{FFMPEG_PATH}" -ss {time} -i "{input_file}" -frames:v 1 "{output_pattern}"'
                else:
                    interval = self.frame_interval.get()
                    cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -vf "fps=1/{interval}" "{output_pattern}"'

            elif treatment == "Ajuster volume audio":
                vol = self.volume.get()
                output_file = self.get_output_file(f"{base_name}_vol{vol}", "mp4")
                cmd = f'"{FFMPEG_PATH}" -i "{input_file}" -c:v copy -af "volume={vol}" "{output_file}"'

            # Vérifier qu'on a bien une commande
            if not cmd:
                self.log("❌ Aucune commande générée!")
                self.root.after(0, lambda: messagebox.showerror("Erreur", "Impossible de générer la commande FFmpeg"))
                return

            # Vérifier qu'on n'écrase pas le fichier source
            if output_file and os.path.abspath(input_file) == os.path.abspath(output_file):
                self.log("❌ DANGER: Le fichier de sortie = fichier d'entrée!")
                self.root.after(0, lambda: messagebox.showerror("Erreur", "Le fichier de sortie ne peut pas écraser le fichier source!"))
                return

            self.log(f"Input: {input_file}")
            self.log(f"Output: {output_file}")
            self.log(f"Commande: {cmd}")
            
            # Exécution avec progression
            process = subprocess.Popen(
                cmd, 
                shell=True, 
                stderr=subprocess.PIPE, 
                stdout=subprocess.PIPE,
                universal_newlines=True
            )

            duration = self.video_info.get("duration", 0)
            error_output = []
            
            for line in process.stderr:
                error_output.append(line.strip())
                if "time=" in line:
                    match = re.search(r'time=(\d{2}):(\d{2}):(\d{2})', line)
                    if match and duration > 0:
                        h, m, s = map(int, match.groups())
                        current_time = h * 3600 + m * 60 + s
                        progress = (current_time / duration) * 100
                        self.root.after(0, lambda p=progress: self.update_progress(p))
                    elif match:
                        # Durée inconnue, juste montrer qu'on avance
                        self.root.after(0, lambda: self.progress_label.config(text="Traitement en cours..."))

            process.wait()

            if process.returncode == 0:
                self.root.after(0, lambda: self.progress_bar.config(value=100))
                
                # Vérifier que le fichier existe vraiment
                if output_file:
                    # Pour les patterns d'images, vérifier le dossier
                    if "frame_" in output_file and "%04d" in output_file:
                        output_dir = os.path.dirname(output_file)
                        pattern = os.path.basename(output_file).replace("%04d", "*")
                        import glob
                        files = glob.glob(os.path.join(output_dir, pattern))
                        if files:
                            self.root.after(0, lambda: messagebox.showinfo("Succès", f"✅ {len(files)} image(s) créée(s) dans:\n{output_dir}"))
                            self.log(f"✅ {len(files)} images créées dans: {output_dir}")
                        else:
                            self.log("⚠ Aucune image trouvée!")
                            self.root.after(0, lambda: messagebox.showwarning("Attention", "FFmpeg a terminé mais aucune image trouvée"))
                    elif os.path.exists(output_file):
                        file_size = os.path.getsize(output_file) / (1024*1024)
                        self.root.after(0, lambda: messagebox.showinfo("Succès", f"✅ Fichier créé ({file_size:.2f} MB):\n{output_file}"))
                        self.log(f"✅ Fichier créé: {output_file} ({file_size:.2f} MB)")
                    else:
                        self.log(f"⚠ FFmpeg dit succès mais fichier introuvable: {output_file}")
                        self.root.after(0, lambda: messagebox.showwarning("Attention", f"FFmpeg a terminé mais le fichier n'a pas été trouvé:\n{output_file}"))
                else:
                    self.log("⚠ output_file est vide!")
                    self.root.after(0, lambda: messagebox.showwarning("Attention", "Erreur interne: chemin de sortie non défini"))
            else:
                error_msg = "\n".join(error_output[-10:])  # 10 dernières lignes
                self.log(f"❌ Erreur FFmpeg (code {process.returncode}):\n{error_msg}")
                self.root.after(0, lambda: messagebox.showerror("Erreur", f"❌ Échec (code {process.returncode})\nVoir les logs"))


        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Erreur", f"❌ {str(e)}"))
            self.log(f"Exception: {e}")
        finally:
            self.processing = False
            self.root.after(0, lambda: self.progress_label.config(text="Terminé"))

    def update_progress(self, value):
        self.progress_bar['value'] = min(value, 100)
        self.progress_label.config(text=f"Progression: {int(value)}%")

if _name_ == "_main_":
    root = tk.Tk()
    app = VideoStudioProApp(root)
    root.mainloop()
