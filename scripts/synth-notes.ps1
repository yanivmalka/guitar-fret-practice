# Synthesises the twelve note-name WAVs the General voice engine matches
# against — the counterpart of synth-extra-voice.ps1 (fret numbers + the
# isolated accidental words). Same recipe: Windows System.Speech, David +
# Zira voices, 22.05 kHz / 16-bit / mono.
#
# Output filenames follow scripts/wav-lib.mts `classify`:
#   alpha_C_<voice>.wav   alpha_Cs_<voice>.wav   ...   -> vocab 'notes-alpha'
#   solfege_do_<voice>.wav solfege_dos_<voice>.wav ... -> vocab 'notes-solfege'
#
# Usage:  powershell -File scripts/synth-notes.ps1 -OutDir scripts/wav
# Then, with synth-extra-voice.ps1 output in the same dir:
#         node --experimental-strip-types scripts/build-general-voice.mts scripts/wav

param(
  [string]$OutDir = "scripts/wav"
)

Add-Type -AssemblyName System.Speech

$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
  22050,
  [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
  [System.Speech.AudioFormat.AudioChannel]::Mono)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$voices = @{
  "david" = "Microsoft David Desktop"
  "zira"  = "Microsoft Zira Desktop"
}

# filename fragment -> text spoken into TTS. The fragment must match the
# ALPHA / SOLFEGE keys in scripts/wav-lib.mts (Cs = C#, dos = do#, ...).
$alpha = [ordered]@{
  C = "C";  Cs = "C sharp";  D = "D";  Ds = "D sharp";  E = "E";  F = "F"
  Fs = "F sharp";  G = "G";  Gs = "G sharp";  A = "A";  As = "A sharp";  B = "B"
}
$solfege = [ordered]@{
  do = "do";  dos = "do sharp";  re = "re";  res = "re sharp";  mi = "mi";  fa = "fa"
  fas = "fa sharp";  sol = "sol";  sols = "sol sharp";  la = "la";  las = "la sharp";  si = "si"
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$count = 0

foreach ($vk in $voices.Keys) {
  $synth.SelectVoice($voices[$vk])
  $synth.Rate = 0

  foreach ($frag in $alpha.Keys) {
    $path = Join-Path $OutDir "alpha_${frag}_$vk.wav"
    $synth.SetOutputToWaveFile($path, $fmt)
    $synth.Speak($alpha[$frag])
    $count++
  }
  foreach ($frag in $solfege.Keys) {
    $path = Join-Path $OutDir "solfege_${frag}_$vk.wav"
    $synth.SetOutputToWaveFile($path, $fmt)
    $synth.Speak($solfege[$frag])
    $count++
  }
}

$synth.SetOutputToNull()
$synth.Dispose()
Write-Host "wrote $count WAVs to $OutDir"
