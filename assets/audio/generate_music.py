import math
import os
import random
import shutil
import struct
import subprocess
import wave
from array import array


SAMPLE_RATE = 24000
DURATION = 48.0
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)
MASTER_GAIN = 0.84
OUTPUT_DIR = os.path.dirname(__file__)
SEED = 41027

random.seed(SEED)


NOTE_INDEX = {
    "C": 0,
    "C#": 1,
    "Db": 1,
    "D": 2,
    "D#": 3,
    "Eb": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "Gb": 6,
    "G": 7,
    "G#": 8,
    "Ab": 8,
    "A": 9,
    "A#": 10,
    "Bb": 10,
    "B": 11,
}


def note_to_freq(note):
    name = note[:-1]
    octave = int(note[-1])
    semitone = NOTE_INDEX[name]
    midi = (octave + 1) * 12 + semitone
    return 440.0 * (2 ** ((midi - 69) / 12))


def clamp(value, low, high):
    return max(low, min(high, value))


def soft_clip(value):
    return math.tanh(value * 1.35)


def make_buffer():
    return array("f", [0.0]) * TOTAL_SAMPLES


def triangle(phase):
    phase = phase % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def add_ping(buffer, start_time, duration, freq, amp, pan=0.0, tone="piano", vibrato=0.0):
    start = int(start_time * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    if start >= TOTAL_SAMPLES or length <= 0:
      return
    end = min(TOTAL_SAMPLES, start + length)
    attack = max(0.01, duration * 0.08)
    release = max(0.04, duration * 0.28)
    for i in range(start, end):
        t = (i - start) / SAMPLE_RATE
        if t < attack:
            env = t / attack
        else:
            sustain_t = t - attack
            decay = max(duration - attack - release, 0.0)
            if sustain_t < decay:
                if tone == "violin":
                    env = 0.92
                elif tone == "pad":
                    env = 0.78
                else:
                    env = math.exp(-sustain_t * (2.4 if tone == "piano" else 3.0))
            else:
                rel_t = sustain_t - decay
                env = max(0.0, 1.0 - rel_t / release)

        vib = 0.0
        if vibrato:
            vib = math.sin(2 * math.pi * (5.0 + pan * 0.7) * t) * vibrato
        phase = (freq * (1.0 + vib)) * t

        if tone == "piano":
            value = (
                math.sin(2 * math.pi * phase)
                + 0.52 * math.sin(2 * math.pi * phase * 2.01)
                + 0.18 * triangle(phase * 0.5)
            )
        elif tone == "violin":
            value = (
                0.65 * math.sin(2 * math.pi * phase)
                + 0.28 * math.sin(2 * math.pi * phase * 2.0)
                + 0.16 * triangle(phase)
            )
        elif tone == "guitar":
            value = (
                0.74 * math.sin(2 * math.pi * phase)
                + 0.22 * math.sin(2 * math.pi * phase * 2.0)
                + 0.1 * math.sin(2 * math.pi * phase * 3.0)
            )
        elif tone == "rhodes":
            value = (
                0.6 * math.sin(2 * math.pi * phase)
                + 0.24 * triangle(phase)
                + 0.16 * math.sin(2 * math.pi * phase * 2.0)
            )
        elif tone == "pad":
            value = (
                0.72 * math.sin(2 * math.pi * phase)
                + 0.22 * triangle(phase * 0.5)
                + 0.1 * math.sin(2 * math.pi * phase * 1.5)
            )
        elif tone == "bass":
            value = (
                0.88 * math.sin(2 * math.pi * phase)
                + 0.12 * math.sin(2 * math.pi * phase * 0.5)
            )
        elif tone == "lead":
            value = (
                0.58 * math.sin(2 * math.pi * phase)
                + 0.25 * triangle(phase)
                + 0.17 * math.sin(2 * math.pi * phase * 2.0)
            )
        else:
            value = math.sin(2 * math.pi * phase)

        value *= amp * env
        if i < TOTAL_SAMPLES:
            buffer[i] += value


def add_noise_burst(buffer, start_time, duration, amp, bright=False):
    start = int(start_time * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    end = min(TOTAL_SAMPLES, start + length)
    state = random.uniform(-1.0, 1.0)
    for i in range(start, end):
        t = (i - start) / SAMPLE_RATE
        env = math.exp(-t * (18.0 if bright else 10.5))
        noise = random.uniform(-1.0, 1.0)
        state = state * (0.74 if bright else 0.84) + noise * (0.26 if bright else 0.16)
        buffer[i] += state * amp * env


def add_kick(buffer, start_time, amp=0.3):
    start = int(start_time * SAMPLE_RATE)
    length = int(0.38 * SAMPLE_RATE)
    end = min(TOTAL_SAMPLES, start + length)
    for i in range(start, end):
        t = (i - start) / SAMPLE_RATE
        env = math.exp(-t * 9.5)
        freq = 84.0 - 40.0 * min(t / 0.24, 1.0)
        phase = freq * t
        click = math.exp(-t * 34.0) * random.uniform(-0.14, 0.14)
        buffer[i] += (math.sin(2 * math.pi * phase) * 0.95 + click) * amp * env


def add_karplus(buffer, start_time, duration, freq, amp, damping=0.991):
    start = int(start_time * SAMPLE_RATE)
    total = int(duration * SAMPLE_RATE)
    period = max(2, int(SAMPLE_RATE / max(freq, 40.0)))
    ring = [random.uniform(-1.0, 1.0) for _ in range(period)]
    idx = 0
    for n in range(total):
        sample_index = start + n
        if sample_index >= TOTAL_SAMPLES:
            break
        current = ring[idx]
        nxt = damping * 0.5 * (current + ring[(idx + 1) % period])
        ring[idx] = nxt
        idx = (idx + 1) % period
        env = math.exp(-n / (SAMPLE_RATE * duration * 0.72))
        body = 1.0 + 0.08 * math.sin(2 * math.pi * 2.2 * (n / SAMPLE_RATE))
        buffer[sample_index] += current * amp * env * body


def apply_delay(buffer, delay_s, feedback, mix):
    delay = int(delay_s * SAMPLE_RATE)
    for i in range(delay, TOTAL_SAMPLES):
        buffer[i] += buffer[i - delay] * feedback * mix


def apply_smoothing(buffer, amount):
    if amount <= 0:
        return
    prev = 0.0
    for i in range(TOTAL_SAMPLES):
        prev = prev * (1.0 - amount) + buffer[i] * amount
        buffer[i] = prev


def apply_loop_crossfade(buffer, window_s=1.8):
    fade = min(int(window_s * SAMPLE_RATE), TOTAL_SAMPLES // 8)
    if fade <= 8:
        return
    start_slice = buffer[:fade]
    end_slice = buffer[-fade:]
    for i in range(fade):
        alpha = i / fade
        mixed = start_slice[i] * alpha + end_slice[i] * (1.0 - alpha)
        buffer[i] = mixed
        buffer[-fade + i] = mixed


def normalize(buffer, peak_target=0.82):
    peak = max(abs(sample) for sample in buffer) or 1.0
    gain = peak_target / peak
    for i in range(TOTAL_SAMPLES):
        buffer[i] = soft_clip(buffer[i] * gain) * MASTER_GAIN


def render_stereo(track_name, left_buffer, right_variation=0.0):
    wav_path = os.path.join(OUTPUT_DIR, f"{track_name}-ambient.wav")
    mp3_path = os.path.join(OUTPUT_DIR, f"{track_name}-ambient.mp3")

    normalize(left_buffer)

    right_buffer = array("f", left_buffer)
    if right_variation:
        apply_delay(right_buffer, right_variation, 0.18, 0.3)
        normalize(right_buffer, peak_target=0.8)

    with wave.open(wav_path, "wb") as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for left, right in zip(left_buffer, right_buffer):
            left_i = int(clamp(left, -1.0, 1.0) * 32767)
            right_i = int(clamp(right, -1.0, 1.0) * 32767)
            frames.extend(struct.pack("<hh", left_i, right_i))
        wav_file.writeframes(frames)

    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        try:
            subprocess.run(
                [
                    ffmpeg_path,
                    "-y",
                    "-i",
                    wav_path,
                    "-codec:a",
                    "libmp3lame",
                    "-q:a",
                    "4",
                    mp3_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            if os.path.exists(mp3_path):
                os.remove(mp3_path)


def schedule_chords(progression):
    return [[note_to_freq(note) for note in chord] for chord in progression]


def build_piano():
    buffer = make_buffer()
    bpm = 80
    beat = 60.0 / bpm
    progression = schedule_chords(
        [
            ["C4", "E4", "G4"],
            ["A3", "C4", "E4"],
            ["F3", "A3", "C4"],
            ["G3", "B3", "D4"],
            ["C4", "E4", "A4"],
            ["A3", "D4", "F4"],
            ["F3", "A3", "C4"],
            ["G3", "B3", "D4"],
        ]
    )
    for bar in range(16):
        chord = progression[bar % len(progression)]
        bar_start = bar * 4 * beat
        bass = chord[0] / 2
        add_ping(buffer, bar_start, 2.7, bass, 0.17, tone="piano")
        pattern = [0, 1, 2, 1, 2, 1, 0, 2]
        for step, note_index in enumerate(pattern):
            start = bar_start + step * 0.5 * beat
            amp = 0.12 if step % 4 else 0.15
            add_ping(buffer, start, 1.55, chord[note_index], amp, tone="piano")
        if bar % 4 == 3:
            add_ping(buffer, bar_start + 3.1 * beat, 1.8, chord[2] * 2, 0.08, tone="piano")
    apply_delay(buffer, 0.24, 0.32, 0.42)
    apply_loop_crossfade(buffer)
    return buffer


def build_violin():
    buffer = make_buffer()
    bpm = 60
    beat = 60.0 / bpm
    chords = schedule_chords(
        [
            ["D4", "A4", "C5"],
            ["F4", "A4", "D5"],
            ["G4", "Bb4", "D5"],
            ["A4", "C5", "E5"],
        ]
    )
    for bar in range(12):
        chord = chords[bar % len(chords)]
        bar_start = bar * 4 * beat
        for idx, freq in enumerate(chord):
            duration = 3.8 if idx < 2 else 3.1
            add_ping(buffer, bar_start, duration, freq, 0.12 - idx * 0.02, tone="violin", vibrato=0.008)
        add_ping(buffer, bar_start + 2.0, 2.2, chord[0] / 2, 0.055, tone="pad", vibrato=0.004)
    apply_smoothing(buffer, 0.08)
    apply_delay(buffer, 0.36, 0.24, 0.34)
    apply_loop_crossfade(buffer)
    return buffer


def build_guitar():
    buffer = make_buffer()
    bpm = 90
    beat = 60.0 / bpm
    chords = schedule_chords(
        [
            ["E3", "B3", "E4", "G4"],
            ["C3", "G3", "C4", "E4"],
            ["G3", "D4", "G4", "B4"],
            ["D3", "A3", "D4", "F#4"],
            ["A2", "E3", "A3", "C#4"],
            ["C3", "G3", "C4", "E4"],
        ]
    )
    for bar in range(18):
        chord = chords[bar % len(chords)]
        bar_start = bar * 4 * beat
        for step in range(8):
            start = bar_start + step * 0.5 * beat
            note = chord[step % len(chord)]
            add_karplus(buffer, start, 1.8, note, 0.15 - (step % 3) * 0.012)
        add_karplus(buffer, bar_start, 2.6, chord[0] / 2, 0.09, damping=0.994)
    apply_delay(buffer, 0.18, 0.2, 0.28)
    apply_loop_crossfade(buffer, 1.4)
    return buffer


def build_jazz():
    buffer = make_buffer()
    bpm = 110
    beat = 60.0 / bpm
    chords = schedule_chords(
        [
            ["F3", "A3", "C4", "Eb4"],
            ["Bb2", "D3", "F3", "A3"],
            ["G3", "B3", "D4", "F4"],
            ["C3", "E3", "G3", "Bb3"],
        ]
    )
    bass_walk = ["F2", "A2", "C3", "D3", "Bb1", "D2", "F2", "A2", "G2", "B2", "D3", "E3", "C2", "E2", "G2", "Bb2"]
    bass_freqs = [note_to_freq(note) for note in bass_walk]
    for bar in range(22):
        chord = chords[bar % len(chords)]
        bar_start = bar * 4 * beat
        for beat_index in range(4):
            hit_start = bar_start + beat_index * beat
            for idx, freq in enumerate(chord[1:]):
                add_ping(buffer, hit_start, 1.05, freq, 0.08 - idx * 0.01, tone="rhodes")
            bass_note = bass_freqs[(bar * 4 + beat_index) % len(bass_freqs)]
            add_ping(buffer, hit_start, 0.72, bass_note, 0.11, tone="bass")
            add_noise_burst(buffer, hit_start + (0.38 if beat_index % 2 else 0.44) * beat, 0.09, 0.018, bright=False)
        add_noise_burst(buffer, bar_start + 3.7 * beat, 0.07, 0.012, bright=True)
    apply_delay(buffer, 0.14, 0.14, 0.18)
    apply_smoothing(buffer, 0.06)
    apply_loop_crossfade(buffer, 1.2)
    return buffer


def build_classical():
    buffer = make_buffer()
    bpm = 75
    beat = 60.0 / bpm
    piano_prog = schedule_chords(
        [
            ["C4", "E4", "G4"],
            ["G3", "B3", "D4"],
            ["A3", "C4", "E4"],
            ["F3", "A3", "C4"],
            ["D4", "F4", "A4"],
        ]
    )
    string_prog = schedule_chords(
        [
            ["C4", "G4", "B4"],
            ["G3", "D4", "A4"],
            ["A3", "E4", "C5"],
            ["F3", "C4", "A4"],
            ["D4", "A4", "C5"],
        ]
    )
    for bar in range(15):
        p_chord = piano_prog[bar % len(piano_prog)]
        s_chord = string_prog[bar % len(string_prog)]
        bar_start = bar * 4 * beat
        add_ping(buffer, bar_start, 3.6, s_chord[0], 0.06, tone="violin", vibrato=0.005)
        add_ping(buffer, bar_start, 3.6, s_chord[1], 0.05, tone="violin", vibrato=0.006)
        add_ping(buffer, bar_start + 0.18, 3.3, s_chord[2], 0.045, tone="pad", vibrato=0.004)
        for step in range(8):
            start = bar_start + step * 0.5 * beat
            freq = p_chord[step % len(p_chord)] * (2 if step > 4 else 1)
            add_ping(buffer, start, 1.4, freq, 0.095, tone="piano")
        add_ping(buffer, bar_start, 2.3, p_chord[0] / 2, 0.08, tone="piano")
    apply_delay(buffer, 0.28, 0.26, 0.36)
    apply_loop_crossfade(buffer)
    return buffer


def build_pop():
    buffer = make_buffer()
    bpm = 100
    beat = 60.0 / bpm
    chords = schedule_chords(
        [
            ["A3", "C#4", "E4"],
            ["F#3", "A3", "C#4"],
            ["D3", "F#3", "A3"],
            ["E3", "G#3", "B3"],
        ]
    )
    motif = [0, 1, 2, 1, 0, 2, 1, 3]
    for bar in range(20):
        chord = chords[bar % len(chords)]
        bar_start = bar * 4 * beat
        add_ping(buffer, bar_start, 3.6, chord[0] / 2, 0.1, tone="pad")
        add_ping(buffer, bar_start, 3.6, chord[1], 0.07, tone="pad")
        add_ping(buffer, bar_start + 0.12, 3.3, chord[2], 0.06, tone="pad")
        for beat_index in range(4):
            add_kick(buffer, bar_start + beat_index * beat, 0.12 if beat_index in (0, 2) else 0.07)
        for step in range(8):
            start = bar_start + step * 0.5 * beat
            source = chord[motif[step] % len(chord)] * (2 if step % 4 == 1 else 1)
            add_ping(buffer, start, 0.58, source, 0.075, tone="lead")
        if bar % 2 == 1:
            add_noise_burst(buffer, bar_start + 3.5 * beat, 0.08, 0.014, bright=True)
    apply_delay(buffer, 0.22, 0.22, 0.24)
    apply_loop_crossfade(buffer, 1.1)
    return buffer


TRACK_BUILDERS = {
    "piano": (build_piano, 0.015),
    "violin": (build_violin, 0.02),
    "guitar": (build_guitar, 0.012),
    "jazz": (build_jazz, 0.01),
    "classical": (build_classical, 0.018),
    "pop": (build_pop, 0.009),
}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for track_name, (builder, stereo_delay) in TRACK_BUILDERS.items():
        print(f"Generating {track_name}...")
        buffer = builder()
        render_stereo(track_name, buffer, stereo_delay)
    print("Done.")


if __name__ == "__main__":
    main()
