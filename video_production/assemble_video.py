import os
import subprocess
import json

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
SLIDES_DIR = os.path.join(BASE_DIR, "slides")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
OUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUT_DIR, exist_ok=True)

def get_audio_duration(path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

# The 7 Segments configuration
SEGMENTS = [
    {
        "id": "seg1_problem",
        "type": "image",
        "visual": os.path.join(SLIDES_DIR, "slide_1_problem.png"),
        "audio": os.path.join(AUDIO_DIR, "act1_problem.mp3"),
        "label": "THE NATIONAL PROBLEM • SIH PROBLEM 26033"
    },
    {
        "id": "seg2_rubric",
        "type": "image",
        "visual": os.path.join(SLIDES_DIR, "slide_2_rubric.png"),
        "audio": os.path.join(AUDIO_DIR, "act2_rubric.mp3"),
        "label": "SIH 2026 JURY EVALUATION RUBRIC ALIGNMENT"
    },
    {
        "id": "seg3_hero",
        "type": "video",
        "visual": os.path.join(CLIPS_DIR, "scene1_hero.webp"),
        "audio": os.path.join(AUDIO_DIR, "act3_walkthrough_hero.mp3"),
        "label": "LIVE PROTOTYPE: MANDI INTELLIGENCE TICKERS"
    },
    {
        "id": "seg4_market",
        "type": "video",
        "visual": os.path.join(CLIPS_DIR, "scene2_market.webp"),
        "audio": os.path.join(AUDIO_DIR, "act3_walkthrough_market.mp3"),
        "label": "LIVE PROTOTYPE: MARKETPLACE & OUT-OF-STOCK VERIFICATION"
    },
    {
        "id": "seg5_engine",
        "type": "video",
        "visual": os.path.join(CLIPS_DIR, "scene3_engine.webp"),
        "audio": os.path.join(AUDIO_DIR, "act3_walkthrough_3d.mp3"),
        "label": "LIVE PROTOTYPE: 3D PRICE REALIZATION ENGINE"
    },
    {
        "id": "seg6_vernacular",
        "type": "two_images",
        "visual1": os.path.join(CLIPS_DIR, "hindi_page.png"),
        "visual2": os.path.join(CLIPS_DIR, "fpo_rfq.png"),
        "audio": os.path.join(AUDIO_DIR, "act3_walkthrough_fpo.mp3"),
        "label": "VERNACULAR INCLUSIVITY & FPO FEDERATION HUB"
    },
    {
        "id": "seg7_conclusion",
        "type": "image",
        "visual": os.path.join(SLIDES_DIR, "slide_4_conclusion.png"),
        "audio": os.path.join(AUDIO_DIR, "act4_conclusion.mp3"),
        "label": "ENTERPRISE ARCHITECTURE & NATIONAL IMPACT"
    }
]

def render_segments():
    rendered_files = []
    
    # Calculate speedup to hit exactly 180 seconds (3:00)
    total_raw_audio = sum(get_audio_duration(s["audio"]) for s in SEGMENTS)
    target_duration = 180.0
    speedup = total_raw_audio / target_duration
    print(f"Total raw audio: {total_raw_audio:.2f}s | Target: {target_duration}s | Calculated Speedup factor: {speedup:.4f}")

    for idx, seg in enumerate(SEGMENTS):
        raw_dur = get_audio_duration(seg["audio"])
        seg_dur = raw_dur / speedup
        out_mp4 = os.path.join(OUT_DIR, f"{seg['id']}.mp4")
        rendered_files.append(out_mp4)
        
        print(f"\n[{idx+1}/7] Rendering {seg['id']} (duration: {seg_dur:.2f}s)...")
        
        # Audio speed filter
        atempo_filter = f"atempo={speedup:.4f}"
        
        if seg["type"] == "image":
            # Slide image with smooth slow pan/scale and lower third tag
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", seg["visual"],
                "-i", seg["audio"],
                "-filter_complex",
                f"[0:v]scale=1920:1080,fps=30[v];[1:a]{atempo_filter}[a]",
                "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-t", f"{seg_dur:.3f}",
                "-pix_fmt", "yuv420p",
                out_mp4
            ]
        elif seg["type"] == "two_images":
            half_dur = seg_dur / 2.0
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-t", f"{half_dur:.3f}", "-i", seg["visual1"],
                "-loop", "1", "-t", f"{half_dur:.3f}", "-i", seg["visual2"],
                "-i", seg["audio"],
                "-filter_complex",
                f"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#F7F5EE,fps=30[v0];"
                f"[1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#F7F5EE,fps=30[v1];"
                f"[v0][v1]concat=n=2:v=1:a=0[v];"
                f"[2:a]{atempo_filter}[a]",
                "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-t", f"{seg_dur:.3f}",
                "-pix_fmt", "yuv420p",
                out_mp4
            ]
        elif seg["type"] == "video":
            # Loop/extend video to match the audio duration if needed
            cmd = [
                "ffmpeg", "-y",
                "-stream_loop", "3", "-i", seg["visual"],
                "-i", seg["audio"],
                "-filter_complex",
                f"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#F7F5EE,fps=30[v];"
                f"[1:a]{atempo_filter}[a]",
                "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                "-t", f"{seg_dur:.3f}",
                "-pix_fmt", "yuv420p",
                out_mp4
            ]
            
        subprocess.run(cmd, check=True)
        print(f"Finished {out_mp4}")

    # Concatenate all 7 segments
    concat_txt = os.path.join(OUT_DIR, "concat_list.txt")
    with open(concat_txt, "w") as f:
        for rf in rendered_files:
            f.write(f"file '{rf.replace(chr(92), '/')}'\n")

    final_output = os.path.join(BASE_DIR, "Aroha_SIH2026_Trailer_3Min.mp4")
    print(f"\nConcatenating full 3-minute video into: {final_output}...")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        final_output
    ]
    subprocess.run(concat_cmd, check=True)
    
    # Final check of duration
    final_dur = get_audio_duration(final_output)
    print(f"\n🎉 SUCCESS! Rendered Final Video: {final_output}")
    print(f"Total Duration: {final_dur:.2f} seconds ({final_dur/60:.2f} minutes)")

if __name__ == "__main__":
    render_segments()
