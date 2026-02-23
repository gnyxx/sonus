/**
 * Generates insights from your listening data — conversational, varied, not the same every time.
 * Uses multiple phrasings and rotates which observations we show so it feels fresh.
 */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, maxCount) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, maxCount);
}

export function generateInsight(stats, recommendations) {
  if (!stats || !stats.tracks?.length) return null;

  const tracks = stats.tracks;
  const n = tracks.length;
  const { tempo_avg, tempo_range } = stats;

  const [tempoMin, tempoMax] = tempo_range ?? [tempo_avg - 15, tempo_avg + 15];
  const tempoSpan = Math.round((tempoMax ?? tempo_avg) - (tempoMin ?? tempo_avg));
  const bpm = Math.round(Number(tempo_avg));

  // --- Compute from your tracks ---
  const artistCounts = {};
  tracks.forEach((t) => {
    const name = t.artist_name ?? "Unknown";
    artistCounts[name] = (artistCounts[name] ?? 0) + 1;
  });
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  const highEnergyCount = tracks.filter((t) => t.energy >= 0.7).length;
  const highValenceCount = tracks.filter((t) => t.valence >= 0.6).length;
  const highDanceCount = tracks.filter((t) => t.danceability >= 0.7).length;
  const highestEnergyTrack = tracks.reduce((best, t) => (t.energy > (best?.energy ?? 0) ? t : best), null);
  const lowestTempoTrack = tracks.reduce((best, t) => (t.tempo < (best?.tempo ?? 999) ? t : best), null);
  const highestTempoTrack = tracks.reduce((best, t) => (t.tempo > (best?.tempo ?? 0) ? t : best), null);

  // --- Recommendations ---
  let recTempoAvg = null;
  let recsInTempoRange = null;
  if (recommendations?.length > 0) {
    recTempoAvg = recommendations.reduce((s, r) => s + Number(r.tempo), 0) / recommendations.length;
    const [tMin, tMax] = tempo_range ?? [tempoMin, tempoMax];
    recsInTempoRange = recommendations.filter(
      (r) => r.tempo >= (tMin ?? 0) - 10 && r.tempo <= (tMax ?? 200) + 10
    ).length;
  }

  // --- Headlines: multiple options per situation so it's not always the same line ---
  const headlines = {
    tightTempo: [
      `You know what groove you like — your top tracks sit in a tight pocket around ${bpm} BPM.`,
      `Clear tempo lane: most of this set hovers around ${bpm} BPM. You’ve got a type.`,
      `Your top tracks share a similar pulse — right around ${bpm} BPM.`,
    ],
    wideTempo: [
      `Your taste runs the gamut — from slow burns to high-energy tracks, all in one rotation.`,
      `You don’t stick to one speed. This set goes from ${Math.round(tempoMin)} to ${Math.round(tempoMax)} BPM.`,
      `Wide range here: you like the contrast between laid-back and full throttle.`,
    ],
    highEnergy: [
      `Your top set leans into high energy — the kind of stuff that keeps the momentum up.`,
      `This is a high-octane set. Almost everything goes hard.`,
      `Energy is the throughline — your picks are consistently intense.`,
    ],
    upbeat: [
      `Your rotation skews upbeat — more bright than broody.`,
      `Most of these lean positive. Good-vibe territory.`,
      `Your top tracks tilt toward the brighter side of the mood spectrum.`,
    ],
    default: [
      `From ${n} track${n === 1 ? "" : "s"} we picked up a clear vibe: around ${bpm} BPM, with a mood that’s distinctly yours.`,
      `This set has a personality — ${bpm} BPM on average, and a mood that fits.`,
      `Your top tracks hang around ${bpm} BPM. The rest is your call.`,
    ],
  };

  let headline;
  if (tempoSpan <= 25 && n >= 3) headline = pick(headlines.tightTempo);
  else if (tempoSpan > 50 && n >= 3) headline = pick(headlines.wideTempo);
  else if (highEnergyCount >= n * 0.7) headline = pick(headlines.highEnergy);
  else if (highValenceCount >= n / 2) headline = pick(headlines.upbeat);
  else headline = pick(headlines.default);

  // --- Build a pool of possible observations (only add what fits the data) ---
  const pool = [];

  if (topArtist && topArtist[1] > 1) {
    const name = topArtist[0];
    const count = topArtist[1];
    pool.push(
      pick(
        count >= 3
          ? [
              `You keep coming back to ${name} — they show up ${count} times in this set.`,
              `${name} dominates this list. ${count} tracks.`,
              `Clear favorite in this set: ${name}, with ${count} appearances.`,
            ]
          : [
              `${name} shows up more than anyone else here.`,
              `If there’s a star of this set, it’s ${name}.`,
            ]
      )
    );
  }

  if (tempoSpan <= 25 && n >= 3 && !headline.includes("tight") && !headline.includes("pocket")) {
    pool.push(
      pick([
        `Your tempo range is pretty consistent. You’ve found a groove and stuck with it.`,
        `Not much spread in BPM — you know what pace you like.`,
        `Tight tempo range. This is a coherent groove.`,
      ])
    );
  } else if (tempoSpan > 50 && n >= 3 && !headline.includes("gamut") && !headline.includes("range")) {
    pool.push(
      pick([
        `You don’t lock into one speed — you like the contrast between slow and fast.`,
        `Big spread in tempo. You’re not married to one BPM.`,
        `Slow and fast both get a seat at the table.`,
      ])
    );
  }

  if (highEnergyCount === n && n >= 3) {
    pool.push(
      pick([
        `Everything in this set goes hard. No filler.`,
        `Zero low-energy tracks. It’s all gas.`,
        `This whole set is high energy. Consistently intense.`,
      ])
    );
  } else if (highestEnergyTrack && highEnergyCount >= 2) {
    const t = highestEnergyTrack;
    pool.push(
      pick([
        `The peak of the set might be "${t.track_name}" — it’s the most intense of the bunch.`,
        `"${t.track_name}" by ${t.artist_name} is the highest-energy track here.`,
        `For pure intensity, "${t.track_name}" leads the pack.`,
      ])
    );
  }

  if (highValenceCount >= n / 2 && highValenceCount < n) {
    pool.push(
      pick([
        `Most of these lean positive; a few bring the mood down in a good way.`,
        `Generally upbeat, with a couple of moodier cuts in the mix.`,
        `Bright overall, but not one-note — there’s some shade in there.`,
      ])
    );
  } else if (highValenceCount < n / 2 && highValenceCount > 0) {
    pool.push(
      pick([
        `You’ve got a mix of moods — not all sunshine, which makes the brighter tracks hit harder.`,
        `A good balance of light and dark. The contrast works.`,
        `Mood-wise you’re all over the map — in a good way.`,
      ])
    );
  }

  if (highDanceCount >= n / 2) {
    pool.push(
      pick([
        `This is move-your-body music. Very danceable.`,
        `Most of these are built for the floor.`,
        `High danceability across the set. You like to move.`,
      ])
    );
  }

  if (
    lowestTempoTrack &&
    highestTempoTrack &&
    lowestTempoTrack !== highestTempoTrack &&
    tempoSpan > 40
  ) {
    const slow = Math.round(Number(lowestTempoTrack.tempo));
    const fast = Math.round(Number(highestTempoTrack.tempo));
    pool.push(
      pick([
        `You go from "${lowestTempoTrack.track_name}" (${slow} BPM) all the way to "${highestTempoTrack.track_name}" (${fast} BPM) — that’s a real range.`,
        `Slowest: "${lowestTempoTrack.track_name}". Fastest: "${highestTempoTrack.track_name}". You cover a lot of ground.`,
        `The spread from ${slow} to ${fast} BPM says you like variety in tempo.`,
      ])
    );
  }

  // Show 2–4 observations so the list isn’t always the same length or order
  const wantCount = Math.min(4, Math.max(2, pool.length));
  const observationsFinal =
    pool.length === 0
      ? [
          `Your top tracks sit around ${bpm} BPM with a balanced mix of energy and mood — no single note dominates.`,
        ]
      : pickN(pool, wantCount);

  // --- Suggestions: multiple phrasings ---
  const suggestionPool = [];
  if (recommendations?.length > 0 && recTempoAvg != null) {
    const tempoDiff = Math.abs(recTempoAvg - Number(tempo_avg));
    if (recsInTempoRange != null && tempoDiff < 15) {
      if (recsInTempoRange >= recommendations.length * 0.6) {
        suggestionPool.push(
          `We kept the picks in your wheelhouse — same kind of groove, so they should feel familiar but fresh.`,
          `The list below matches your tempo zone. Should slot in nicely.`,
          `These sit in the same BPM neighborhood as what you already love.`
        );
      } else {
        suggestionPool.push(
          `The list below mixes tracks that match your tempo with a few that nudge you slightly out of it.`,
          `Most of these match your groove; a couple stretch the tempo a bit.`,
          `We stayed close to your lane with a few curveballs.`
        );
      }
    } else {
      suggestionPool.push(
        `The recommendations sit in a similar zone to what you already love — same energy, similar pace.`,
        `These picks are tuned to your profile. Same vibe, new names.`,
        `We matched the energy and pace to what you’re already playing.`
      );
    }
  } else {
    suggestionPool.push(
      `The picks below were chosen to match this profile so they should slot right into your taste.`,
      `Everything below is aligned with what we see in your top tracks.`,
      `These should feel like they belong in the same playlist.`
    );
  }

  const suggestion = pick(suggestionPool);

  const ctaOptions =
    recommendations?.length > 0
      ? [
          "Here are some picks we think you’ll like:",
          "Some recommendations based on this set:",
          "Picks that match your vibe:",
        ]
      : ["Load your recommendations to see picks that match this profile."];

  return {
    headline,
    observations: observationsFinal,
    suggestion,
    cta: pick(ctaOptions),
  };
}
