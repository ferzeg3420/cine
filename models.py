"""
This file defines the database models
"""
import datetime
import os

from . common import db, Field, auth
from pydal.validators import *

def get_user():
    return auth.current_user.get('id') if auth.current_user else None

def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_username():
    return auth.current_user.get('username') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

APP_FOLDER = os.path.dirname(__file__)
IMAGE_FOLDER = os.path.join(APP_FOLDER, 'static/photos')
ABS_IMAGE_FOLDER = os.path.abspath(IMAGE_FOLDER)

db.define_table(
    'profiles',
    Field('user_email', default=get_user_email),
    Field('photo','upload', uploadfolder=ABS_IMAGE_FOLDER),
    Field('bio', 'text'),
    Field('favMovie', 'text'),
)

db.define_table(
    'movies',
    Field('index'),
    Field('title'),
    Field('year'),
    Field('genres'),
    Field('description'),
    Field('directors'),
    Field('actors'),
    Field('runtime'),
    Field('rating'),
    Field('votes'),
    Field('revenue'),
    Field('metascore'),
    Field('trailer'),
)

db.define_table(
    'stars',
    Field('movie', 'reference movies'),
    Field('ts', 'datetime', default=get_time),
    Field('rating', 'integer', default=0),
    Field('has_rating', 'integer', default=0),
    Field('rater', 'reference auth_user', default=get_user()),
)

db.define_table(
    'favorites',
    Field('movie', 'reference movies'),
    Field('ts', 'datetime', default=get_time),
    Field('is_favorite', 'integer', default=0),
    Field('user', 'reference auth_user', default=get_user()),
)

db.define_table(
    'friends',
    Field('requester', 'reference auth_user'),
    Field('user_requested', 'reference auth_user'),
    Field('status', 'integer', default=1),
)

db.define_table(
    'reviews',
    Field('user_email', default=get_user_email),
    Field('review_text', 'text'),
    Field('ts', 'datetime', default=get_time),
    Field('movie', 'reference movies'),
    Field('reviewer', 'reference auth_user', default=get_user()),
)

db.define_table(
    'messages',
    Field('sender', default=get_user_email),
    Field('receiver', 'reference auth_user'),
    Field('content', 'text'),
    Field('ts', 'datetime', default=get_time),
)

# Fernando added these

db.define_table(
    'contacts',
    Field('friend_a', 'reference auth_user'),
    Field('friend_b', 'reference auth_user'),
)

db.define_table(
    'conversation',
    Field('interlocutor_a', 'reference auth_user'),
    Field('interlocutor_b', 'reference auth_user'),
)

db.define_table(
    'message',
    Field('convo', 'reference conversation'), 
    Field('content', 'text'), 
    Field('recipient_id', 'reference auth_user'), 
    Field('ts', 'datetime', default=get_time), 
)

db.define_table(
    'tickets',
    Field('ip', 'text'), 
    Field('user_id', 'text'), 
    Field('ts', 'text'), 
    Field('claimed', 'boolean', default=False), 
)

db.define_table(
    'div_order',
    Field('user', 'reference auth_user'),
    Field('data', 'list:string', default=[]),
)

dirname = os.path.dirname(__file__)
filename = os.path.join(dirname, 'pydal_movies.csv')

# load the movies form a csv file if the movies database is empty
with open(filename, 'r', encoding='utf-8') as dumpfile:
    if db(db.movies).isempty():
        db.import_from_csv_file(dumpfile, delimeter=",")


db.commit()
