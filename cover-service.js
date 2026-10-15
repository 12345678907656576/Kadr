"use strict";

const TMDB_API_KEY = "911da913475e0595d09174e5f4e3f78d";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_SMALL_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w92";
const TMDB_POPULAR_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

async function fetchMovieMeta(title, type, year, signal) {
  const endpoint = type === "movie" ? "movie" : type === "series" ? "tv" : null;
  if (!endpoint) {
    throw new Error("TMDB поддерживает поиск только фильмов и сериалов.");
  }

  const emptyMeta = { coverUrl: null, year: null, titleRu: null, tmdbId: null };
  const searchUrl = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
  searchUrl.searchParams.set("api_key", TMDB_API_KEY);
  searchUrl.searchParams.set("query", title);
  searchUrl.searchParams.set("language", "ru-RU");
  if (endpoint === "movie" && Number.isInteger(Number(year)) && Number(year) > 0) {
    searchUrl.searchParams.set("year", String(year));
  }

  try {
    const response = await fetch(searchUrl, { signal });
    if (!response.ok) {
      throw new Error(`TMDB вернул ошибку ${response.status}.`);
    }

    const result = await response.json();
    const match = Array.isArray(result?.results) ? result.results[0] : null;
    if (!match) return emptyMeta;

    const releaseDate = match.release_date || match.first_air_date;
    return {
      coverUrl: match.poster_path ? `${TMDB_IMAGE_BASE_URL}${match.poster_path}` : null,
      year: releaseDate && /^\d{4}/.test(releaseDate) ? Number(releaseDate.slice(0, 4)) : null,
      titleRu: match.title || match.name || null,
      tmdbId: Number.isInteger(match.id) ? match.id : null
    };
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось найти фильм или сериал через TMDB.", error);
    }
    return emptyMeta;
  }
}

async function fetchMovieSearch(title, type, signal) {
  const endpoint = type === "movie" ? "movie" : type === "series" ? "tv" : null;
  if (!endpoint) {
    throw new Error("TMDB поддерживает поиск только фильмов и сериалов.");
  }

  console.log("fetchMovieSearch вызван для:", title, type);
  const searchUrl = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
  searchUrl.searchParams.set("api_key", TMDB_API_KEY);
  searchUrl.searchParams.set("query", title);
  searchUrl.searchParams.set("language", "ru-RU");
  searchUrl.searchParams.set("per_page", "5");

  try {
    const response = await fetch(searchUrl, { signal });
    if (!response.ok) {
      throw new Error(`TMDB вернул ошибку ${response.status}.`);
    }

    const result = await response.json();
    console.log("API вернул:", result);
    if (!Array.isArray(result?.results)) return [];

    return result.results.slice(0, 5).map((item) => {
      const releaseDate = item.release_date || item.first_air_date || "";
      const year = releaseDate.slice(0, 4);
      const titleRu = item.title || item.name || "";
      const titleOriginal = item.original_title || item.original_name || "";

      return {
        id: item.id,
        titleRu,
        titleOriginal,
        year: /^\d{4}$/.test(year) ? year : null,
        coverUrl: item.poster_path ? `${TMDB_SMALL_IMAGE_BASE_URL}${item.poster_path}` : null
      };
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось выполнить поиск фильма или сериала через TMDB.", error);
    }
    return [];
  }
}

async function fetchMovieDetails(id, type, signal) {
  const endpoint = type === "movie" ? "movie" : type === "series" ? "tv" : null;
  if (!endpoint) {
    throw new Error("TMDB поддерживает поиск только фильмов и сериалов.");
  }

  const detailsUrl = new URL(`https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(id)}`);
  detailsUrl.searchParams.set("api_key", TMDB_API_KEY);
  detailsUrl.searchParams.set("language", "ru-RU");

  try {
    const response = await fetch(detailsUrl, { signal });
    if (!response.ok) {
      throw new Error(`TMDB вернул ошибку ${response.status}.`);
    }

    const item = await response.json();
    const releaseDate = item.release_date || item.first_air_date || "";
    const year = releaseDate.slice(0, 4);
    const genres = Array.isArray(item.genres)
      ? item.genres.map((genre) => genre.name).filter(Boolean).join(", ") || null
      : null;
    const voteAverage = typeof item.vote_average === "number" && Number.isFinite(item.vote_average)
      ? item.vote_average
      : null;

    return {
      coverUrl: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
      year: /^\d{4}$/.test(year) ? Number(year) : null,
      genres,
      tmdbRating: voteAverage === null ? null : Math.round(voteAverage * 10) / 10,
      runtime: type === "movie" && Number.isInteger(item.runtime) && item.runtime > 0
        ? item.runtime
        : null,
      titleRu: item.title || item.name || null,
      tmdbId: Number.isInteger(item.id) ? item.id : Number(id),
      totalSeasons: type === "series" && Number.isInteger(item.number_of_seasons)
        ? item.number_of_seasons
        : null,
      totalEpisodes: type === "series" && Number.isInteger(item.number_of_episodes)
        ? item.number_of_episodes
        : null,
      seriesStatus: type === "series" && typeof item.status === "string"
        ? item.status
        : null,
      seasons: type === "series" && Array.isArray(item.seasons)
        ? item.seasons.map((season) => ({
          seasonNumber: season.season_number,
          episodeCount: season.episode_count
        }))
        : []
    };
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось загрузить подробности фильма или сериала из TMDB.", error);
    }
    return null;
  }
}

async function fetchPopularTMDB(endpoint, type, signal) {
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}/popular`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "ru-RU");
  url.searchParams.set("page", "1");

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`TMDB вернул ошибку ${response.status}.`);
    const result = await response.json();
    if (!Array.isArray(result?.results)) return [];

    return result.results.slice(0, 20).map((item) => {
      const releaseDate = type === "movie" ? item.release_date : item.first_air_date;
      const year = typeof releaseDate === "string" && /^\d{4}/.test(releaseDate)
        ? Number(releaseDate.slice(0, 4))
        : null;
      return {
        id: item.id,
        titleRu: type === "movie" ? item.title || "" : item.name || "",
        year,
        coverUrl: item.poster_path ? `${TMDB_POPULAR_IMAGE_BASE_URL}${item.poster_path}` : null,
        rating: typeof item.vote_average === "number" && Number.isFinite(item.vote_average)
          ? Math.round(item.vote_average * 10) / 10
          : null,
        tmdbId: Number.isInteger(item.id) ? item.id : null
      };
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn(`Не удалось загрузить популярные ${type === "movie" ? "фильмы" : "сериалы"} TMDB.`, error);
    }
    return [];
  }
}

async function fetchPopularMovies(signal) {
  return fetchPopularTMDB("movie", "movie", signal);
}

async function fetchPopularSeries(signal) {
  return fetchPopularTMDB("tv", "series", signal);
}

async function fetchPopularAnime(signal) {
  const query = `
    query {
      Page(page: 1, perPage: 20) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id
          title { romaji english native }
          coverImage { large extraLarge }
          seasonYear
          averageScore
          episodes
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query }),
      signal
    });
    if (!response.ok) throw new Error(`AniList вернул ошибку ${response.status}.`);
    const result = await response.json();
    if (result.errors?.length) {
      console.error("AniList вернул GraphQL-ошибки для популярных аниме.", result.errors);
      return [];
    }

    const media = result.data?.Page?.media;
    if (!Array.isArray(media)) return [];
    return media.slice(0, 20).map((item) => ({
      id: item.id,
      titleRu: item.title?.romaji || item.title?.english || "",
      year: item.seasonYear ?? null,
      coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || null,
      rating: typeof item.averageScore === "number" && Number.isFinite(item.averageScore)
        ? item.averageScore / 10
        : null,
      episodes: item.episodes ?? null,
      anilistId: Number.isInteger(item.id) ? item.id : null
    }));
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось загрузить популярные аниме AniList.", error);
    }
    return [];
  }
}

async function fetchPopularMovieDetails(id, signal) {
  return fetchMovieDetails(id, "movie", signal);
}

async function fetchPopularSeriesDetails(id, signal) {
  return fetchMovieDetails(id, "series", signal);
}

const ANIME_RU_TO_EN = {
  "ван": "One Piece",
  "ванпис": "One Piece",
  "ван пис": "One Piece",
  "ван-пис": "One Piece",
  "атака": "Attack on Titan",
  "атака титанов": "Attack on Titan",
  "аттак": "Attack on Titan",
  "наруто": "Naruto",
  "наруто шиппуден": "Naruto Shippuden",
  "клинок рассекающий демонов": "Demon Slayer",
  "магическая битва": "Jujutsu Kaisen",
  "тетрадь смерти": "Death Note",
  "стальной алхимик": "Fullmetal Alchemist",
  "мой герой академия": "My Hero Academia",
  "токийский гуль": "Tokyo Ghoul",
  "код гиас": "Code Geass",
  "ванпанчмен": "One Punch Man",
  "человек-бензопила": "Chainsaw Man",
  "охотник х охотник": "Hunter x Hunter",
  "берсерк": "Berserk",
  "евангелион": "Neon Genesis Evangelion",
  "соул итер": "Soul Eater",
  "дорохедоро": "Dorohedoro",
  "клеймор": "Claymore"
};

function normalizeAnimeSearchTitle(title) {
  return title.toLocaleLowerCase("ru").replaceAll("ё", "е").replace(/\s+/g, " ").trim();
}

function getAnimeSearchTitle(title) {
  const normalizedTitle = normalizeAnimeSearchTitle(title);
  const searchTitle = ANIME_RU_TO_EN[normalizedTitle] || title.trim().replace(/\s+/g, " ");
  console.log("getAnimeSearchTitle:", title, "→", normalizedTitle, "→", searchTitle);
  return searchTitle;
}

async function fetchAnimeSearch(title, signal) {
  console.log("Анисе: старт поиска", title);
  const searchTitle = getAnimeSearchTitle(title);
  const apiUrl = "https://graphql.anilist.co";
  console.log("Анисе: URL", apiUrl, "Поисковый запрос:", searchTitle);
  const query = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            extraLarge
            large
            medium
          }
          episodes
          seasonYear
          startDate { year }
          status
        }
      }
    }
  `;
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abortRequest, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    console.log("fetchAnimeSearch: searchTitle =", searchTitle);
    console.log("fetchAnimeSearch → AniList, search =", searchTitle);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query, variables: { search: searchTitle, perPage: 5 } }),
      signal: controller.signal
    });
    console.log("fetchAnimeSearch → status", res.status);
    if (!res.ok) {
      throw new Error(`AniList вернул ошибку ${res.status}.`);
    }

    const result = await res.json();
    console.log("fetchAnimeSearch → data", JSON.stringify(result).slice(0, 500));
    console.log("Анисе: ответ", result);
    console.log("Ответ API:", result);
    const media = result.data?.Page?.media;
    console.log("fetchAnimeSearch → media count", media?.length);
    if (result.errors?.length) {
      console.error("AniList вернул GraphQL-ошибки при поиске аниме.", result.errors);
      return [];
    }

    if (!Array.isArray(media)) return [];

    return media.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title?.english || item.title?.romaji || "",
      coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || null,
      episodes: item.episodes ?? null,
      year: item.seasonYear || item.startDate?.year || null,
      status: item.status ?? null
    }));
  } catch (error) {
    if (signal?.aborted) return [];
    console.error("Анисе: ошибка", error);
    return [];
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", abortRequest);
  }
}

async function searchAnimeRussian(title, signal) {
  console.log("Анисе: старт поиска", title);
  const url = new URL("https://shikimori.one/api/animes");
  url.searchParams.set("search", title);
  url.searchParams.set("limit", "5");
  const targetUrl = url.href;
  console.log("Анисе: URL", targetUrl);
  const proxies = [
    {
      name: "corsproxy.io",
      url: `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
    },
    {
      name: "AllOrigins",
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    },
    {
      name: "cors.eu.org",
      url: `https://cors.eu.org/${targetUrl}`
    }
  ];
  if (location.hostname === "localhost") {
    proxies.unshift({ name: "Shikimori direct", url: targetUrl });
  }
  const deadline = Date.now() + 1500;

  for (const proxy of proxies) {
    if (signal?.aborted) return [];
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    console.log("Shikimori: пробую прокси", proxy.name);

    const controller = new AbortController();
    const abortRequest = () => controller.abort();
    if (signal) signal.addEventListener("abort", abortRequest, { once: true });
    const timeoutId = setTimeout(
      () => controller.abort(),
      Math.min(remainingMs, 700)
    );

    try {
      console.log("Анисе: URL", proxy.url);
      const response = await fetch(proxy.url, {
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`${proxy.name} вернул ошибку ${response.status}.`);
      }

      const results = await response.json();
      console.log("Анисе: ответ", results);
      console.log("Shikimori: ответ", results);
      if (!Array.isArray(results)) {
        throw new Error(`${proxy.name} вернул ответ неверного формата.`);
      }

      return results.slice(0, 5).flatMap((item) => {
        const rusName = typeof item.russian === "string" ? item.russian.trim() : "";
        if (!rusName) return [];

        const airedYear = typeof item.aired_on === "string"
          ? item.aired_on.slice(0, 4)
          : "";
        const year = /^\d{4}$/.test(airedYear) ? Number(airedYear) : null;
        const imagePath = item.image?.original || item.image?.preview;

        return [{
          id: item.id,
          rusName,
          engName: item.name || "",
          year,
          episodes: Number.isInteger(item.episodes) ? item.episodes : null,
          coverUrl: imagePath ? new URL(imagePath, "https://shikimori.one").href : null,
          status: null,
          seasons: null
        }];
      });
    } catch (error) {
      if (signal?.aborted) return [];
      console.error("Анисе: ошибка", error);
      console.log("Shikimori: ошибка", error);
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", abortRequest);
    }
  }

  console.error("Все прокси упали для Shikimori");
  return [];
}

async function fetchAnimeSeasonCount(media, signal) {
  if (!media || media.format === "MOVIE") return null;

  const visited = new Set([media.id]);
  let currentMedia = media;
  let seasonCount = 1;
  let foundSequel = false;

  try {
    while (seasonCount < 20) {
      const sequel = currentMedia.relations?.edges?.find((edge) =>
        edge.relationType === "SEQUEL" &&
        Number.isInteger(edge.node?.id) &&
        (edge.node.format === "TV" || edge.node.format === "TV_SHORT") &&
        !visited.has(edge.node.id)
      );
      if (!sequel) break;

      foundSequel = true;
      visited.add(sequel.node.id);
      const sequelTitle = sequel.node.title?.english || sequel.node.title?.romaji || "";
      if (!/\bpart\s+\d+\b/i.test(sequelTitle)) seasonCount += 1;

      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            format
            title { romaji english }
            relations {
              edges {
                relationType
                node { id format title { romaji english } }
              }
            }
          }
        }
      `;
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ query, variables: { id: sequel.node.id } }),
        signal
      });
      if (!response.ok) {
        throw new Error(`AniList вернул ошибку ${response.status} при подсчёте сезонов.`);
      }

      const result = await response.json();
      if (result.errors?.length) {
        console.warn("AniList вернул GraphQL-ошибки при подсчёте сезонов.", result.errors);
        return null;
      }
      currentMedia = result.data?.Media;
      if (!currentMedia) return null;
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось проверить продолжения аниме при подсчёте сезонов.", error);
    }
    return null;
  }

  return foundSequel ? seasonCount : null;
}

async function fetchAnimeMeta(title, signal) {
  console.log("Анисе: старт поиска", title);
  console.log("fetchAnimeMeta вызван для:", title);
  const apiUrl = "https://graphql.anilist.co";
  console.log("Анисе: URL", apiUrl);
  const query = `
    query ($search: String) {
      Page {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          episodes
          seasonYear
          startDate {
            year
          }
          status
          format
          duration
          relations {
            edges {
              relationType
              node {
                id
                format
                episodes
                title { romaji english }
              }
            }
          }
        }
      }
    }
  `;
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abortRequest, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query, variables: { search: title } }),
      signal: controller.signal
    });
    console.log("AniList: status", res.status);
    if (!res.ok) {
      throw new Error(`AniList вернул ошибку ${res.status}.`);
    }

    const result = await res.json();
    console.log("Анисе: ответ", result);
    console.log("Ответ API:", result);
    console.log("API вернул:", result);
    console.log("AniList meta:", result);
    if (result.errors?.length) {
      console.error("AniList вернул GraphQL-ошибки.", result.errors);
      return { coverUrl: null, episodes: null, year: null, status: null, format: null, duration: null, seasons: null };
    }

    const mediaList = result.data?.Page?.media;
    const media = Array.isArray(mediaList) ? mediaList[0] : null;
    if (!media) {
      return { coverUrl: null, episodes: null, year: null, status: null, format: null, duration: null, seasons: null };
    }

    const seasons = await fetchAnimeSeasonCount(media, controller.signal);
    const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null;
    const year = media.seasonYear || media.startDate?.year || null;
    console.log("URL обложки:", coverUrl);
    console.log("Год:", year);

    return {
      coverUrl,
      episodes: media.episodes ?? null,
      year,
      status: media.status ?? null,
      format: media.format ?? null,
      duration: media.duration ?? null,
      seasons
    };
  } catch (error) {
    console.error("Анисе: ошибка", error);
    console.warn("Не удалось найти обложку аниме через AniList.", error);
    return { coverUrl: null, episodes: null, year: null, status: null, format: null, duration: null, seasons: null };
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", abortRequest);
  }
}

async function fetchAnimeDetails(id, signal) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
        seasonYear
        startDate { year }
        episodes
        duration
        genres
        averageScore
        status
        format
        relations {
          edges {
            relationType
            node { id format episodes title { romaji english } }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query, variables: { id: Number(id) } }),
      signal
    });
    if (!response.ok) throw new Error(`AniList вернул ошибку ${response.status}.`);
    const result = await response.json();
    if (result.errors?.length) {
      console.error("AniList вернул GraphQL-ошибки для аниме.", result.errors);
      return null;
    }

    const media = result.data?.Media;
    if (!media) return null;
    const seasons = await fetchAnimeSeasonCount(media, signal);
    const averageScore = typeof media.averageScore === "number" && Number.isFinite(media.averageScore)
      ? media.averageScore / 10
      : null;
    const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || null;
    const year = media.seasonYear || media.startDate?.year || null;
    console.log("URL обложки:", coverUrl);
    console.log("Год:", year);

    return {
      coverUrl,
      year,
      episodes: media.episodes ?? null,
      duration: media.duration ?? null,
      genres: Array.isArray(media.genres) ? media.genres.filter(Boolean).join(", ") || null : null,
      rating: averageScore,
      status: media.status ?? null,
      format: media.format ?? null,
      seasons,
      anilistId: media.id
    };
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn("Не удалось загрузить подробности аниме из AniList.", error);
    }
    return null;
  }
}
