let player = null;
let ytApiReady = false;

// Mini-shiur playback state
let miniLessons = [];
let isPlayingLesson = false;
let currentLessonIndex = null;
let currentLessonSegmentIndex = 0;

const STORAGE_KEYS = {
  videos: "my_videos_text",
  duration: "my_segment_duration",
  segments: "my_segments_html",
  completed: "my_segments_completed"
};

// YouTube IFrame API callback
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  player = new YT.Player("player", {
    width: "100%",
    height: "360",
    playerVars: {
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3
    },
    events: { onStateChange: onPlayerStateChange }
  });
};

function onPlayerStateChange(event) {
  const overlay = document.getElementById("player-overlay");
  if (!overlay) return;

  if (event.data === YT.PlayerState.ENDED) {
    if (isPlayingLesson) {
      // Move to next segment within the same mini-shiur
      currentLessonSegmentIndex++;
      playCurrentLessonSegment();
    } else {
      overlay.style.display = "flex";
    }
  }
}

// Status helpers
function setStatus(message, isError = false) {
  const statusEl = document.getElementById("status-message");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("status-message--error", !!isError);
}

function clearStatus() {
  setStatus("");
}

// Time helpers
function parseHmsToSeconds(str) {
  if (!str) throw new Error("Mini-shiur duration is required.");

  const cleaned = str.trim();
  const parts = cleaned.split(":").map((p) => p.trim());

  if (parts.some((p) => p === "" || isNaN(Number(p)))) {
    throw new Error("Use HH:MM:SS, MM:SS, or SS (numbers only).");
  }

  let seconds = 0;
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    seconds = h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    seconds = m * 60 + s;
  } else if (parts.length === 1) {
    seconds = Number(parts[0]);
  } else {
    throw new Error("Invalid duration format.");
  }

  if (!isFinite(seconds) || seconds <= 0) {
    throw new Error("Mini-shiur duration must be greater than 0 seconds.");
  }

  return seconds;
}

function formatSeconds(secondsTotal) {
  const s = Math.floor(secondsTotal % 60);
  const m = Math.floor((secondsTotal / 60) % 60);
  const h = Math.floor(secondsTotal / 3600);

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

// YouTube helpers
function extractVideoId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return u.pathname.slice(1) || null;
    }

    if (host === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex !== -1 && parts[shortsIndex + 1]) {
        return parts[shortsIndex + 1];
      }

      const embedIndex = parts.indexOf("embed");
      if (embedIndex !== -1 && parts[embedIndex + 1]) {
        return parts[embedIndex + 1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function buildSegmentUrl(base, startSeconds) {
  let url;
  try {
    url = new URL(base);
  } catch {
    return base;
  }

  url.searchParams.delete("t");
  url.searchParams.set("t", String(Math.floor(startSeconds)));

  return url.toString();
}

// Get duration of a single video via YouTube API
function getVideoDuration(videoId) {
  return new Promise((resolve, reject) => {
    if (!player) {
      reject(new Error("Player not ready."));
      return;
    }

    player.cueVideoById(videoId);

    const maxWaitMs = 10000;
    const intervalMs = 400;
    let waited = 0;

    const timer = setInterval(() => {
      const duration = player.getDuration();
      if (duration && duration > 0) {
        clearInterval(timer);
        resolve(duration);
      } else {
        waited += intervalMs;
        if (waited >= maxWaitMs) {
          clearInterval(timer);
          reject(
            new Error(
              "Unable to read video duration. One of the videos may be restricted or unavailable."
            )
          );
        }
      }
    }, intervalMs);
  });
}

// Clear segments table
function clearSegments(tbody) {
  tbody.innerHTML =
    '<tr><td colspan="5" class="segments-empty">No mini-shiurim yet. Enter course videos and a duration, then click “Build Mini-Shiurim”.</td></tr>';
}

// Save which checkboxes are checked
function saveCompletionState(tbody) {
  const checks = tbody.querySelectorAll(".segment-check");
  const completed = [];
  checks.forEach((cb) => {
    if (cb.checked) {
      completed.push(Number(cb.dataset.index));
    }
  });
  localStorage.setItem(STORAGE_KEYS.completed, JSON.stringify(completed));
}

// Reapply checked state based on saved data
function restoreCompletionState(tbody) {
  const raw = localStorage.getItem(STORAGE_KEYS.completed);
  if (!raw) return;
  let completed;
  try {
    completed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(completed)) return;

  const checks = tbody.querySelectorAll(".segment-check");
  checks.forEach((cb) => {
    const idx = Number(cb.dataset.index);
    if (completed.includes(idx)) {
      cb.checked = true;
    }
  });
}

// Build mini-shiur segments across multiple videos
function buildCourseSegments(videos, lessonLenSec, tbody) {
  const total = videos.reduce((s, v) => s + v.duration, 0);
  miniLessons = []; // reset in-memory lessons

  let pos = 0;
  let lessonIndex = 1;

  while (pos < total) {
    const lessonStartGlobal = pos;
    const remainingTotal = total - pos;
    let remaining = Math.min(lessonLenSec, remainingTotal);

    const lessonSegments = [];

    while (remaining > 0 && pos < total) {
      let acc = 0;
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (pos < acc + v.duration) {
          const offset = pos - acc;            // seconds into this video
          const avail = v.duration - offset;   // how much left in this video
          const use = Math.min(avail, remaining);

          lessonSegments.push({
            lessonIndex,
            videoIndex: i,
            url: v.url,
            videoId: v.videoId,
            start: offset,
            end: offset + use
          });

          pos += use;
          remaining -= use;
          break;
        }
        acc += v.duration;
      }
    }

    miniLessons.push({
      index: lessonIndex,
      startGlobal: lessonStartGlobal,
      endGlobal: pos,
      segments: lessonSegments
    });

    lessonIndex++;
  }

  // Render table rows: ONE ROW PER MINI-SHIUR
  const rows = [];
  let rowIndex = 1;

  miniLessons.forEach((lesson, idx) => {
    const startLabel = formatSeconds(lesson.startGlobal);
    const endLabel = formatSeconds(lesson.endGlobal);
    const firstSeg = lesson.segments[0];
    const segmentUrl = buildSegmentUrl(firstSeg.url, firstSeg.start);

    rows.push(
      `<tr>
        <td><input type="checkbox" class="segment-check" data-index="${rowIndex}" /></td>
        <td>${lesson.index}</td>
        <td>${startLabel}</td>
        <td>${endLabel}</td>
        <td>
          <a class="segment-link"
             href="${segmentUrl}"
             data-lesson="${idx}">
             Play
          </a>
        </td>
      </tr>`
    );

    rowIndex++;
  });

  tbody.innerHTML = rows.join("");
  return { totalSeconds: total, lessonCount: miniLessons.length };
}

// Play current segment in a mini-shiur
function playCurrentLessonSegment() {
  const overlay = document.getElementById("player-overlay");
  const lesson = miniLessons[currentLessonIndex];
  if (!lesson) {
    isPlayingLesson = false;
    if (overlay) overlay.style.display = "flex";
    return;
  }

  if (currentLessonSegmentIndex >= lesson.segments.length) {
    // Finished all segments in this mini-shiur
    isPlayingLesson = false;
    if (overlay) overlay.style.display = "flex";
    return;
  }

  const seg = lesson.segments[currentLessonSegmentIndex];
  if (!ytApiReady || !player || !seg.videoId) {
    setStatus("Player is not ready yet.", true);
    return;
  }

  if (overlay) overlay.style.display = "none";

  player.loadVideoById({
    videoId: seg.videoId,
    startSeconds: seg.start,
    endSeconds: seg.end
  });
}

// MAIN

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("course-form");
  const segmentsBody = document.getElementById("segments-body");
  const videosInput = document.getElementById("videos-input");
  const durationInput = document.getElementById("segment-duration");
  const overlay = document.getElementById("player-overlay");
  const totalDurationEl = document.getElementById("total-duration");

  // Restore saved inputs and segments
  const savedVideos = localStorage.getItem(STORAGE_KEYS.videos);
  const savedDuration = localStorage.getItem(STORAGE_KEYS.duration);
  const savedSegments = localStorage.getItem(STORAGE_KEYS.segments);

  if (savedVideos) {
    videosInput.value = savedVideos;
  }
  if (savedDuration) {
    durationInput.value = savedDuration;
  }

  if (savedSegments) {
    segmentsBody.innerHTML = savedSegments;
    restoreCompletionState(segmentsBody);
  } else {
    clearSegments(segmentsBody);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();
    clearSegments(segmentsBody);
    if (overlay) overlay.style.display = "none";
    if (totalDurationEl) totalDurationEl.textContent = "Total course duration: –";

    if (!ytApiReady || !player) {
      setStatus(
        "YouTube Player API is still loading. Please wait a moment and try again.",
        true
      );
      return;
    }

    const lines = videosInput.value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!lines.length) {
      setStatus("Please enter at least one YouTube URL.", true);
      return;
    }

    let segmentDurationSeconds;
    try {
      segmentDurationSeconds = parseHmsToSeconds(durationInput.value.trim());
    } catch (err) {
      setStatus(err.message || "Invalid mini-shiur duration.", true);
      return;
    }

    // Build video list (URLs + IDs)
    const videos = [];
    for (const line of lines) {
      const videoId = extractVideoId(line);
      if (!videoId) {
        setStatus(`Invalid YouTube URL: ${line}`, true);
        return;
      }
      videos.push({ url: line, videoId, duration: 0 });
    }

    setStatus("Loading videos and calculating durations…");

    // Get durations sequentially
    try {
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const dur = await getVideoDuration(v.videoId);
        videos[i].duration = dur;
      }
    } catch (err) {
      setStatus(err.message || "Unable to read one of the video durations.", true);
      return;
    }

    const { totalSeconds, lessonCount } = buildCourseSegments(
      videos,
      segmentDurationSeconds,
      segmentsBody
    );

    if (totalDurationEl) {
      totalDurationEl.textContent = `Total course duration: ${formatSeconds(
        totalSeconds
      )} (${(totalSeconds / 3600).toFixed(2)} hours) • Mini-shiurim: ${lessonCount}`;
    }

    // Persist latest state
    localStorage.setItem(STORAGE_KEYS.videos, videosInput.value);
    localStorage.setItem(STORAGE_KEYS.duration, durationInput.value.trim());
    localStorage.setItem(STORAGE_KEYS.segments, segmentsBody.innerHTML);
    saveCompletionState(segmentsBody);

    setStatus(
      `Generated ${lessonCount} mini-shiurim from ${videos.length} video(s).`
    );
  });

  // Play mini-shiur when clicking its row's Play link
  segmentsBody.addEventListener("click", (e) => {
    const link = e.target.closest(".segment-link");
    if (!link) return;

    // Allow ctrl/cmd-click to open in new tab using plain URL
    if (e.metaKey || e.ctrlKey) return;

    e.preventDefault();

    const lessonIdx = Number(link.dataset.lesson);
    const lesson = miniLessons[lessonIdx];
    if (!lesson) {
      setStatus("Please rebuild the course to play this mini-shiur.", true);
      return;
    }

    currentLessonIndex = lessonIdx;
    currentLessonSegmentIndex = 0;
    isPlayingLesson = true;

    playCurrentLessonSegment();
  });

  // Persist checkbox changes
  segmentsBody.addEventListener("change", (e) => {
    if (!e.target.classList.contains("segment-check")) return;
    saveCompletionState(segmentsBody);
    localStorage.setItem(STORAGE_KEYS.segments, segmentsBody.innerHTML);
  });
});
