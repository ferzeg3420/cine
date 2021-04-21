import pandas as pd
import numpy as np
import csv
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import os

NUM_MOVIES_TO_DISPLAY = 5

# Setting up the cosine similarity train set that finds similar titles and genres:
cwd = os.path.dirname(__file__)
csv_filename = os.path.join(cwd, 'movies.csv')

# setting up the train set for the rec engine that uses descriptions:
train_set = []
train_set_4_movie = []
train_set_4_list = []
train_set_4_title = []
with open(csv_filename) as csvfile:
   reader = csv.DictReader(csvfile)
   for row in reader:
      train_set.append(row['description'])
      train_set_4_list.append(row['title'] + ' ' + row['genres'])
      train_set_4_movie.append(row['title'] + ' ' + row['genres'])
      train_set_4_title.append(row['title'])

def enumerate_movies(similar_movies):
   i = 1
   enumerated = []
   for score in similar_movies[0]:
      entry = [i, score]
      enumerated.append(entry)
      i += 1
   return enumerated

def recommend_similar_descript(user_descript):
   train_set.append(user_descript)

   tfidf_vectorizer = TfidfVectorizer()
   tfidf_matrix_train = tfidf_vectorizer.fit_transform(train_set)  # finds the tfidf score with normalization
   sim_movies = cosine_similarity(tfidf_matrix_train[-1:], tfidf_matrix_train)  # here the last element of
                                                                                # tfidf_matrix_train is matched
                                                                                # with other elements

   train_set.pop(-1) # gets rid of the user_description for future use.

   sim_movies = enumerate_movies(sim_movies)
   sim_movies.pop(-1) # gets rid of the user's description

   sim_movies = sorted(sim_movies, key=lambda item: item[1], reverse=True)

   r_similar_movies = []
   for i in sim_movies[:5]:
      r_similar_movies.append(i[0])
   return r_similar_movies

def recommend_similar(movie):
   train_set_4_movie.append(movie)

   tfidf_vectorizer = TfidfVectorizer()
   tfidf_matrix_train = tfidf_vectorizer.fit_transform(train_set_4_movie)  # finds the tfidf score with normalization
   sim_movies = cosine_similarity(tfidf_matrix_train[-1:], tfidf_matrix_train)  # here the
   # movie argument movie is matched
   # with other elements

   sim_movies = enumerate_movies(sim_movies)

   train_set_4_movie.pop(-1) # gets rid of the user's input movie that was added on top.
   sim_movies.pop(-1) # gets rid of the user's input movie that was added on top.

   sim_movies = sorted(sim_movies, key=lambda item: item[1], reverse=True)
   sim_movies.pop(0) # gets rid of the best match which is the movie itself.

   r_similar_movies = []
   for i in sim_movies[:5]:
      r_similar_movies.append(i[0])
   return r_similar_movies


def recommend_similar_from_list(movies, movie_ids):
   train_set_list = train_set_4_list + movies
   movies_len = len(movies)

   tfidf_vectorizer = TfidfVectorizer()
   tfidf_matrix_train = tfidf_vectorizer.fit_transform(train_set_list)  # finds the tfidf score with normalization
   sim_movies = cosine_similarity(tfidf_matrix_train[-movies_len:], tfidf_matrix_train)  # here the
   # movie list pass as an argument (converted later to a matrix) is matched
   # with other elements

   sim_movies = enumerate_movies(sim_movies)

   for i in movies:
      sim_movies.pop(-1) # gets rid of the user's input movies that were added on

   for i in sorted(movie_ids, reverse=True):
      sim_movies.pop(i - 1) # gets rid of the user movies that were in the list already

   sim_movies = sorted(sim_movies, key=lambda item: item[1], reverse=True)

   r_similar_movies = []
   for i in sim_movies[:5]:
      r_similar_movies.append(i[0])
   return r_similar_movies

def find_similar_title(title):
   train_set_4_title.append(title)

   tfidf_vectorizer = TfidfVectorizer()
   tfidf_matrix_train = tfidf_vectorizer.fit_transform(train_set_4_title)  # finds the tfidf score with normalization
   sim_movies = cosine_similarity(tfidf_matrix_train[-1:], tfidf_matrix_train)  # here the
   # movie passed as an argument (converted later to a matrix) is matched
   # with other elements

   sim_movies = enumerate_movies(sim_movies)

   sim_movies.pop(-1) # gets rid of the user's input movies that were added on
   train_set_4_title.pop(-1) # gets rid of the user's input movies that were added on

   sim_movies = sorted(sim_movies, key=lambda item: item[1], reverse=True)

   r_similar_movies = []
   for i in sim_movies[:5]:
      r_similar_movies.append(i[0])
   return r_similar_movies
