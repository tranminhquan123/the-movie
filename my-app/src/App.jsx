import React from "react";
import { useState, useEffect } from "react";
import Search from "./components/Search";
import Spinner from "./components/Spinner";
import MovieCard from "./components/MovieCard";
import { useDebounce } from "react-use";
import { updateSearchCount, getTrendingMovies } from "./appwrite.js";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const App = () => {
  const [debounceSearchTerm, setDebounceSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [movieList, setMovieList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [trendingMovies, setTrendingMovies] = useState([]);

  // Debounce the search term to prevent making too many API requests
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebounceSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = "") => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error("Fail to fetch movies");
      }

      const data = await response.json();

      if (data.Response === "False") {
        setErrorMessage(data.Error || "No movies found");
        setMovieList([]);
        return;
      }

      setMovieList(data.results || []);

      if (query && data.results.length > 0) {
        // Update the search count in Appwrite database
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      setErrorMessage("Failed to fetch movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingMovie = async () => {
    try {
      const movies = await getTrendingMovies();

      setTrendingMovies(movies);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchMovies(debounceSearchTerm);
  }, [debounceSearchTerm]);

  useEffect(() => {
    loadTrendingMovie();
  }, []);

  return (
    <main>
      <div className='pattern' />

      <div className='wrapper'>
        <header>
          <img src='./hero.png' alt='Hero Banner' />
          <h1>
            Discover <span className='text-gradient'>Movies</span> You’ll Love,
            Effortlessly!
          </h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <h1 className='text-white'>{searchTerm}</h1>
        </header>

        {trendingMovies.length > 0 && (
          <section className='trending'>
            <h2>Trending Movies</h2>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className='all-movies'>
          <h2>All Movies</h2>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className='text-red-500'>{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
