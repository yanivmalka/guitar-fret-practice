# Synthesises the "extra" reference words the General voice engine still
# lacks — fret numbers 1-24 and the isolated accidental words — the same way
# the twelve note names were made: Windows System.Speech, David + Zira
# voices, 22.05 kHz / 16-bit / mono WAV.
#
# Output filenames follow scripts/build-general-voice.mts:
#   frets_<n>_<voice>.wav            -> vocab 'frets-1-24',        label "<n>"
#   alpha_sharp_<voice>.wav          -> vocab 'accidentals-alpha', label "#"
#   alpha_flat_<voice>.wav           -> vocab 'accidentals-alpha', label "b"
#   solfege_diese_<voice>.wav        -> vocab 'accidentals-solfege',label "#"
#   solfege_bemol_<voice>.wav        -> vocab 'accidentals-solfege',label "b"
#
# Usage:  powershell -File scripts/synth-extra-voice.ps1 -OutDir <dir>
# Then:   node --experimental-strip-types scripts/build-general-voice.mts <dir> --merge

param(
  [string]$OutDir = "scripts/extra-wav"
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

# Number -> spoken English words.
$ones = @("zero","one","two","three","four","five","six","seven","eight","nine",
          "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
          "seventeen","eighteen","nineteen")
function Get-NumberWords([int]$n) {
  if ($n -lt 20) { return $ones[$n] }
  $tens = "twenty"
  $rem = $n - 20
  if ($rem -eq 0) { return $tens }
  return "$tens " + $ones[$rem]
}

# Each entry: filename fragment -> text to speak. Two texts for the French
# words so an English voice has a phonetic fallback alongside the literal.
$words = @(
  @{ frag = "alpha_sharp";   texts = @("sharp") }
  @{ frag = "alpha_flat";    texts = @("flat") }
  @{ frag = "solfege_diese"; texts = @("dièse", "dee ez") }
  @{ frag = "solfege_bemol"; texts = @("bémol", "bay mole") }
)

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$count = 0

foreach ($vk in $voices.Keys) {
  $synth.SelectVoice($voices[$vk])
  $synth.Rate = 0

  foreach ($w in $words) {
    $i = 0
    foreach ($t in $w.texts) {
      $suffix = if ($i -eq 0) { $vk } else { "$vk$($i + 1)" }
      $path = Join-Path $OutDir "$($w.frag)_$suffix.wav"
      $synth.SetOutputToWaveFile($path, $fmt)
      $synth.Speak($t)
      $count++
      $i++
    }
  }

  for ($n = 1; $n -le 24; $n++) {
    $path = Join-Path $OutDir "frets_${n}_$vk.wav"
    $synth.SetOutputToWaveFile($path, $fmt)
    $synth.Speak((Get-NumberWords $n))
    $count++
  }
}

$synth.SetOutputToNull()
$synth.Dispose()
Write-Host "wrote $count WAVs to $OutDir"
