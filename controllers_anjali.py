"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""
from . rec_engine import *
import datetime
from random import shuffle
import os
from random import randrange
import uuid

from py4web import action, request, abort, redirect, URL, Field
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner

from yatl.helpers import A
from . common import db, session, T, cache, auth, signed_url
from . models import get_user_email

url_signer = URLSigner(session)

size_of_the_database = 1000

#---------------------------------  ---------------  ---------- Helpers

cwd = os.path.dirname(__file__)
trailer_filename = os.path.join(cwd, 'trailers.links')

with open(trailer_filename) as trailers_file:
    trailers = trailers_file.readlines()

def get_clapper_count(movie_id):
    all_ratings = db(db.stars.movie == movie_id).select(db.stars.rating)
    total = 0
    for i in all_ratings:
        total += i.rating
    return total

def get_favorite(movie_id):
    user_id = auth.current_user.get('id')

    assert movie_id is not None
    favorite_entry = db((db.favorites.movie == movie_id) &
                      (db.favorites.user == user_id)).select().first()
    is_favorite = favorite_entry.is_favorite if favorite_entry is not None else 0
    return is_favorite

def get_rating(movie_id):
   user_id = auth.current_user.get('id')
   assert movie_id is not None
   rating_entry = db((db.stars.movie == movie_id) &
                     (db.stars.rater == user_id)).select().first()
   rating = rating_entry.rating if rating_entry is not None else 0
   return rating

def get_name(email):
    r = db(db.auth_user.email == email).select().first()
    return r.first_name + " " + r.last_name if r is not None else "Unknown"

#---------------------------------  ---------------  ---------- Homepage

#https://stackoverflow.com/questions/16222956/reading-a-file-line-by-line-into-elements-of-an-array-in-python
def get_trailer():
    shuffle(trailers)
    trailer_url = trailers[0]
    return trailer_url

@action('index')
@action.uses('index.html', auth.user, db, session)
def index():
    return dict(
        load_rec_url=URL('load_rec', signer=url_signer),
        load_rand_rec_url=URL('load_rand_rec', signer=url_signer),
        load_fav_url=URL('load_favs', signer=url_signer),
        load_friends_url=URL('load_friends', signer=url_signer),
        load_rec_people_url=URL('load_rec_people', signer=url_signer),
        load_reviews_url=URL('load_reviews', signer=url_signer),
        set_rating_url=URL('set_rating', signer=url_signer),
        add_friend_url=URL('add_friend', signer=url_signer),
        accept_friend_url=URL('accept_friend', signer=url_signer),
        trailer_url=get_trailer(),
        save_msg_url=URL('save_msg', signer=url_signer),
        name=get_name(auth.current_user.get('email')),
        info=db(db.profiles.user_email == auth.current_user.get('email')).select(),
    )

#returns movies the user hasn't liked or favorited
@action('load_rand_rec')
@action.uses(url_signer.verify())
def load_rand_rec():
    rows = []
    all_movies = db(db.movies).select(db.movies.id).as_list()

    rated_movies = db((db.stars.has_rating == 1)
                      & (db.stars.rater == auth.current_user.get('id') )).select(db.stars.movie).as_list()

    favorited_movies = db((db.favorites.is_favorite)
                          & (db.favorites.user == auth.current_user.get('id') )).select(db.favorites.movie).as_list()

    seen_movies = [item.get('movie') for item in rated_movies] + [item.get('movie') for item in favorited_movies]

    unseen_movies = [item.get('id') for item in all_movies if item.get('id') not in seen_movies]
    shuffle(unseen_movies)
    for id in unseen_movies[:5]:
        t = get_title_from_index(id)
        rows.append({
            'title': t,
            'movie_id': id + 1
        })
    return dict(rows=rows)

@action('load_favs')
@action.uses(url_signer.verify())
def load_favs():
    user_id = auth.current_user.get('id')
    favorite_movies = db((db.favorites.movie == db.movies.id) &
                         (db.favorites.is_favorite == 1) &
                         (db.favorites.user == user_id)).select(db.movies.title,
                                                                db.movies.id,
                                                                orderby=~db.favorites.ts)
    rows = [ {"title": t.get('title'), "movie_id": t.get('id')} for t in favorite_movies ]
    return dict(rows=rows)

@action('load_friends')
@action.uses(url_signer.verify())
def load_friends():
    rows = []
    current_id = auth.current_user.get('id')
    for row in db(db.friends.status == 1).select():
        if row.requester == current_id:
            email = db(db.auth_user.id == row.user_requested).select().first().email
            rows.append({ 'id': row.user_requested, 'name': get_name(email) })  
        elif row.user_requested == current_id:
            email = db(db.auth_user.id == row.requester).select().first().email
            rows.append({ 'id': row.requester, 'name': get_name(email) })
    return dict(rows=rows)

@action('load_rec_people')
@action.uses(url_signer.verify())
def load_rec_people():
    rows = []
    current_id = auth.current_user.get('id')
    for row in db().select(db.auth_user.id, db.auth_user.email):
        if row.id != current_id:
            status = 1 # default status is not friends
            friendship_check_1 = db((db.friends.requester == current_id) & 
                (db.friends.user_requested == row.id)).select().first()
            if friendship_check_1 is not None:
                if friendship_check_1.status == 0:
                    status = 2 # waiting for response
                else:
                    status = 4 # friends
            friendship_check_2 = db((db.friends.requester == row.id) & 
                (db.friends.user_requested == current_id)).select().first()
            if friendship_check_2 is not None:
                if friendship_check_2.status == 0:
                    status = 3 # can accept a request
                else:
                    status = 4
            if status != 4:
                rows.append({
                    'id': row.id,
                    'name': get_name(row.email),
                    'status': status
                })        
    return dict(rows=rows)

@action('load_reviews')
@action.uses(url_signer.verify())
def load_reviews():
    user_reviews = db(db.reviews.user_email == get_user_email()).select(orderby=~db.reviews.ts)
    rows = []
    for r in user_reviews:
        user = auth.current_user.get('id') if auth.current_user else None
        movie_entry = db(db.movies.id == r.get('movie')).select().first()
        stars_entry = db((db.stars.movie == r.get('movie'))
                         & (db.stars.rater == user)).select().first()
        rows.append({'text': r.get('review_text'),
                     'title': movie_entry.title,
                     'rating': stars_entry.rating,
                     'num_stars_display': stars_entry.rating,
                     'movie_id': movie_entry.id})
    return dict(rows=rows)

#---------------------------------  ---------------  ---------- Movie_info page

@action('get_movie_info')
@action.uses(url_signer.verify(), db)
def get_movie_info():
    movie_id = request.params.get('movie_id')
    row = db(db.movies.id == movie_id).select(db.movies.title,
                                              db.movies.id,
                                              db.movies.description).first()
    is_favorite = get_favorite(row.id)
    clapper_count = get_clapper_count(movie_id)
    rating = get_rating(row.id)
    return dict(
        clapper_count=clapper_count,
        is_favorite=is_favorite,
        title=row.title,
        description=row.description,
        rating=rating,
    )

@action('movie_info_page/<movie_id>')
@action.uses('movie_info_page.html', auth.user, db, session)
def movie_info_page(movie_id=None):
    return dict(
        movie_id=movie_id,
        get_reviews_url=URL('get_reviews', signer=url_signer),
        add_review_url=URL('add_review', signer=url_signer),
        delete_review_url=URL('delete_review', signer=url_signer),
        movie_info_url=URL('get_movie_info', signer=url_signer),
        set_favorite_url=URL('set_favorite', signer=url_signer),
        set_rating_url=URL('set_rating', signer=url_signer),
    )

def get_reviews_helper(id):
    unformatted = db(db.reviews.movie == id).select(orderby=~db.reviews.ts)
    reviews = []
    for j in unformatted:
        rating = db(db.stars.movie == j.movie).select().first()
        name = get_name(j.user_email)
        is_owner = 1 if j.user_email == auth.current_user.get('email') else 0
        formatted_entry = {'review_id': j.id,
                           'text': j.review_text,
                           'author': name,
                           'rating': rating.rating,
                           'is_owner': is_owner}
        reviews.append(formatted_entry)
    return reviews

@action('get_reviews')
@action.uses(url_signer.verify(), db, auth.user)
def get_reviews():
    id = request.params.get('movie_id')
    reviews = get_reviews_helper(id)
    return dict(reviews=reviews)

@action('add_review', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def add_review():
    id = request.json.get('movie_id')
    r = request.json.get('review_text')
    review_entry = db((db.reviews.movie == id)
                         & (db.reviews.user_email == get_user_email()))
    if len(review_entry.select()) == 0:
        db.reviews.insert(review_text=r, movie=id)
        print("no original review")
    else:
        new_ts = datetime.datetime.utcnow()
        print(review_entry.select().first())
        review_entry.update(review_text=r, ts=new_ts)
        print("Yes original review")
    reviews = get_reviews_helper(id) # formats the review for the javascript part
    return dict(reviews=reviews)

@action('delete_review', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def delete_review():
    r = request.json.get('review_id')
    id = request.json.get('movie_id')
    u_e = db(db.reviews.id == r).select().first()
    if u_e.get('user_email') == auth.current_user.get("email"):
        db(db.reviews.id == r).delete()
    rev = get_reviews_helper(id)
    return dict(reviews=rev)

#---------------------------------  ---------------  ---------- Recommendation search page

@action('search')
@action.uses('search.html', auth.user, db, session)
def search():
   return dict(
        load_rec_url = URL('load_rec', signer=url_signer),
        set_rating_url=URL('set_rating', signer=url_signer),
        set_favorite_url=URL('set_favorite', signer=url_signer),
   )

@action('load_rec')
@action.uses(url_signer.verify())
def load_rec():
   movie_user_likes = request.params.get('user_movie')
   recommended_ids = recommend_similar(movie_user_likes)
   rows = []
   for id in recommended_ids:
       title = get_title_from_index(id)
       rating = get_rating(id + 1)
       is_favorite = get_favorite(id + 1)
       rows.append({
                    'title': title,
                    'movie_id': id + 1,
                    'rating': rating,
                    'is_favorite': is_favorite,
                    'num_stars_display': rating})
   return dict(rows=rows)


@action('set_rating', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def set_rating():
    movie_id = request.json.get('movie_id')
    user_id = auth.current_user.get('id')
    rating = request.json.get('rating')

    assert movie_id is not None and rating is not None
    db.stars.update_or_insert(
        ((db.stars.movie == movie_id) & (db.stars.rater == user_id)),
        movie=movie_id,
        has_rating=1,
        rater=user_id,
        rating=rating
    )
    return "ok" # Just to have some confirmation in the Network tab.

@action('set_favorite', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def set_favorite():
    movie_id = request.json.get('movie_id')
    user_id = auth.current_user.get('id')
    is_favorite = request.json.get('is_favorite')

    assert movie_id is not None and is_favorite is not None
    db.favorites.update_or_insert(
        ((db.favorites.movie == movie_id) & (db.favorites.user == user_id)),
        movie=movie_id,
        user=user_id,
        is_favorite=is_favorite,
        ts=datetime.datetime.utcnow()
    )
    return "ok" # Just to have some confirmation in the Network tab.

#---------------------------------  ---------------  ---------- Friend Request
@action('add_friend', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def add_friend():
    requester = auth.current_user.get('id')
    user_requested = request.json.get('user_requested')
    db.friends.insert(requester=requester, user_requested=user_requested, status=0)
    return "ok"

@action('accept_friend', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def accept_friend():
    print("in accept friend")
    user_requested = auth.current_user.get('id')
    requester = request.json.get('requester')
    friendship_entry = db((db.friends.requester == requester) & 
                        (db.friends.user_requested == user_requested)).select().first()
    if friendship_entry is not None:
        is_friendship = db.friends.update_or_insert(
                            ((db.friends.requester == requester) & (db.friends.user_requested == user_requested)),
                            status = 1
                        )
    else:
        is_friendship = 0
    return is_friendship

#---------------------------------  ---------------  ---------- User Profile
@action('create_profile')
@action.uses('profile_form.html')
def create_profile():
    return dict()

@action('save_profile', method=['GET', 'POST'])
@action.uses(auth.user, db, session)
def save_profile():
    form = Form(db.profiles, form_name='myProfile')
    p = db.profiles[form.vars['id']]
    profile_id = p.update_record(user_email=auth.current_user.get('email'))
    return dict(profile_id=profile_id)
	
@action('edit_profile/<profile_id>', method=['GET', 'POST'])
@action.uses('edit_profile_form.html', auth.user, db, session)
def edit_profile(profile_id=None):
    p = db.profiles[profile_id]
    if(p is None):
        redirect(URL('index'))
    elif p.user_email != auth.current_user['email']:
        redirect(URL('index')) 
    bio = p.bio
    favMovie = p.favMovie
    img = p.photo
    return dict(profile_id=profile_id, formBio=bio, formMovie=favMovie, formImg=img)

@action('update_profile', method=['GET', 'POST'])
@action.uses(auth.user, db, session)
def update_profile():
    profile=db(db.profiles.user_email == auth.current_user.get('email')).select().first()
    pID=profile.id
    form  = Form(db.profiles, dbio=False, form_name='myProfile') 
    p = db.profiles[pID]
    profile_id = p.update_record(photo=form.vars['photo'], bio=form.vars['bio'], favMovie=form.vars['favMovie'])
    return dict(profile_id=profile_id)

#---------------------------------  ---------------  ---------- Chat Box
@action('save_msg', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def save_msg():
    sender = auth.current_user.get('id')
    receiver = request.json.get('receiver')
    content = request.json.get('content')
    db.messages.insert(sender=sender, receiver=receiver, content=content, ts=datetime.datetime.utcnow())
    return "ok"