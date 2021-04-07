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
import json
from random import randrange
import uuid

from py4web import action, request, abort, redirect, URL, Field
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner

from yatl.helpers import A
from . common import db, session, T, cache, auth, signed_url
from . models import get_user_email
from . models import get_user

url_signer = URLSigner(session)

size_of_the_database = 1000

users = {}

#---------------------------------  ---------------  ---------- Helpers

def my_capitalize(s):
    no_cap = ['a', 'an', 'the', 'for', 'nor', 'but', 'so', 'yet',
              'as', 'at', 'around', 'after', 'by', 'along', 'for',
              'to', 'with', 'without', 'of']
    l = s.split(' ')
    r = []
    i = 0
    for e in l:
        if i == 0 or i == (len(l) - 1):
            r.append(e.capitalize())
        elif e in no_cap:
            r.append(e)
        else:
            r.append(e.capitalize())
        i += 1
    #print(r)
    return ' '.join(r)

def format_movies(movies):
   formatted = []
   for m in movies:
       movie_entry = db(db.movies.id == m).select().first()
       formatted.append(movie_entry.title + ' ' +  movie_entry.genres)
   return formatted

def format_movie(movie_title):
    movie_entry = db(db.movies.title == movie_title).select().first()
    if movie_entry is not None:
        formatted = movie_entry.title + ' ' +  movie_entry.genres
    else:
        formatted = ""
    return formatted

def get_title_from_movie_id(id):
    title_entry = db(db.movies.id == id).select('title').first()
    return title_entry.title

def get_trailer_from_movie_id(id):
    trailer_entry = db(db.movies.id == id).select('trailer').first()
    return trailer_entry.trailer

def get_username(_id):
    auth_entry = db(db.auth_user.id == _id).select().first()
    username = auth_entry.get('first_name') + ' ' + auth_entry.get('last_name')
    #print(username)
    return username

def get_people_same_favs(current_user):
    movies_user_faved_entry = db(db.favorites.user == current_user).select(db.favorites.movie,
                                                                           orderby=~db.favorites.ts).as_list()
    movies_user_faved = [m.get('movie') for m in movies_user_faved_entry[:10]]
    ppl_same_favs = []
    for m in movies_user_faved:
        ppl_same_favs += [i.get('user') for i in db(db.favorites.movie == m).select(db.favorites.user).as_list()]
    return ppl_same_favs

def get_people_same_likes(current_user):
    movies_user_liked_entry = db((db.stars.rater == current_user)
                                 & (db.stars.rating > 2)).select(db.stars.movie).as_list()
    movies_user_liked = [ m.get('movie') for m in movies_user_liked_entry[:10] ] # limited to 10 bc of above
    ppl_same_likes = []
    for m in movies_user_liked:
        ppl_same_likes += [ i.get('rater') for i in db((db.stars.movie == m)
                                                       &(db.stars.rating > 2)).select(db.stars.rater).as_list() ]
    return ppl_same_likes

def get_status(other_user):
    current_user = get_user()
    requester_status_entry = db((db.friends.requester == current_user)
                                & (db.friends.user_requested == other_user)).select().first()
    requester_status = requester_status_entry.get('status') if requester_status_entry is not None else 1

    return requester_status

def get_all_friends():
    current_user = get_user()
    friends_entry = db((db.friends.requester == current_user)
                  & (db.friends.status == 4)).select().as_list()
    friends = [ f.get('user_requested') for f in friends_entry ]
    return friends

def get_rec_people():
    """
     This will absolutely not work in real life. The Algorithm is O(N*M) w/o the [:10] in 'get_ppl_same_.*'.
     With the [:10], the algorithm should be C * O(M) + K * O(N) + M * log(M). Where M is the number of users and N is
     the number  of  movies. The constant is super high! And the algorithm is actually executed each time a user sees
     the homepage. Maybe if it was done on login and the results stored somewhere.
    """
    current_user = get_user()
    rec_people = {}

    ppl_same_favs = get_people_same_favs(current_user)
    ppl_same_likes = get_people_same_likes(current_user)
    friends = get_all_friends()

    for p in ppl_same_favs:
        if p == current_user or p in friends:
            continue
        elif p in rec_people:
            rec_people[p] += 2
        else:
            rec_people[p] = 2

    # doesn't account for when a user rates the movie a 5 and another user gives a 1
    for p in ppl_same_likes:
        if p == current_user or p in friends:
            continue
        elif p in rec_people:
            rec_people[p] += 1
        else:
            rec_people[p] = 1

    # sorts the recommended people by number of similar likes
    rec_people = {k: v for k, v in sorted(rec_people.items(), key=lambda item: item[1], reverse=True)}
    #print(rec_people)
    return rec_people

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
    chat_socket_url = \
        "ws://" + request.environ.get('HTTP_HOST') + URL('chatsocket')

    return dict(
        chatsocket_url=chat_socket_url,
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
        fetch_msg_url=URL('fetch_msg', signer=url_signer),
        name=get_name(auth.current_user.get('email')),
        info=db(db.profiles.user_email == auth.current_user.get('email')).select(),
        generate_ticket_url=URL('generate_ticket'), #new
        load_contacts_url=URL('get_contacts'), #new
        load_messages_url=URL('load_messages'), #new
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

    if len(seen_movies) > 0:
        result_movies = recommend_similar_from_list(format_movies(seen_movies), seen_movies)
    else:
        # pick random from unseen movies
        result_movies = [item.get('id') for item in all_movies if item.get('id') not in seen_movies]
        shuffle(result_movies)

    trailer = get_trailer_from_movie_id(result_movies[0])
    for id in result_movies[:5]:
        #print("from movie id in rand rec:", id, get_title_from_movie_id(id))
        t = get_title_from_movie_id(id)
        rows.append({
            'title': t,
            'movie_id': id,
        })
    return dict(rows=rows, trailer=trailer)

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
    current_id = auth.current_user.get('id')
    friends = get_all_friends()
    rows = []
    for id in friends:
        rows.append({"id": id, "name": get_username(id), "curr_user": current_id})
    return dict(rows=rows)

@action('load_rec_people')
@action.uses(url_signer.verify())
def load_rec_people():
    rows_ = [ i[0] for i in get_rec_people().items() ]
    rows = []
    for i in rows_:
    #    print(i)
        username = get_username(i)
        rows.append({"id": i,
					 "name": username,
					 "status": get_status(i)})
    #print(rows)
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
        #print(db(db.stars).select())
        #print(j)
        rating = db((db.stars.movie == j.movie)
                    & (db.stars.rater == j.reviewer)).select().first()
        name = get_name(j.user_email)
        #print("name, rating", name, rating)
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
        db.reviews.insert(review_text=r, movie=id, user_email=get_user_email(), reviewer=get_user())
        #print("no original review")
    else:
        new_ts = datetime.datetime.utcnow()
        #print(review_entry.select().first())
        review_entry.update(review_text=r, ts=new_ts)
        #print("Yes original review")
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
        find_title_url = URL('find_title', signer=url_signer),
        load_rec_descript_url = URL('load_rec_descript', signer=url_signer),
        set_rating_url=URL('set_rating', signer=url_signer),
        set_favorite_url=URL('set_favorite', signer=url_signer),
   )

@action('load_rec')
@action.uses(url_signer.verify())
def load_rec():
   movie_title = request.params.get('user_movie')
   movie_user_likes = format_movie(my_capitalize(movie_title))
   if movie_user_likes == "": return dict(rows=[])
   recommended_ids = recommend_similar(movie_user_likes)
   rows = []
   for id in recommended_ids:
       title = get_title_from_movie_id(id)
       rating = get_rating(id)
       is_favorite = get_favorite(id)
       rows.append({
                    'title': title,
                    'movie_id': id,
                    'rating': rating,
                    'is_favorite': is_favorite,
                    'num_stars_display': rating})
   return dict(rows=rows)

@action('find_title')
@action.uses(url_signer.verify())
def find_title():
    #print("find title")
    movie_title = request.params.get('user_movie')
    found_ids = find_similar_title(movie_title)
    #print(found_ids)
    rows = []
    for id in found_ids:
        title = get_title_from_movie_id(id)
        rating = get_rating(id)
        is_favorite = get_favorite(id)
        rows.append({
            'title': title,
            'movie_id': id,
            'rating': rating,
            'is_favorite': is_favorite,
            'num_stars_display': rating})
    return dict(rows=rows)

@action('load_rec_descript')
@action.uses(url_signer.verify())
def load_rec_descript():
    user_description = request.params.get('description')
    recommended_ids = recommend_similar_descript(user_description)
    rows = []
    for id in recommended_ids:
        title = get_title_from_movie_id(id)
        rating = get_rating(id)
        is_favorite = get_favorite(id)
        rows.append({
            'title': title,
            'movie_id': id,
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
	
#---------------------------------  ---------------  ---------- User Profile

@action('create_profile', method=['GET', 'POST'])
@action.uses('profile_form.html', db, session)
def create_profile():
    form = Form(
                [
                  Field('Photo', 'upload'),
                  Field('Bio', 'text'),
                  Field('Favorite_Movie', 'text'),
                ],
                form_name='Edit Profile',
                formstyle=FormStyleBulma
            )
    if form.accepted:
        db.profiles.update_or_insert(
            (db.profiles.user_email == auth.current_user.get('email')),
            user_email=auth.current_user.get('email'),
            photo=form.vars.get('Photo'),
            bio=form.vars.get('Bio'),
            favMovie=form.vars.get('Bio')
        )
        redirect(URL('index')) 
    return dict(form=form)
	
@action('edit_profile', method=['GET', 'POST'])
@action.uses('edit_profile_form.html', auth.user, db, session)
def edit_profile():
    form = Form(
                [
                  Field('Photo', 'upload'),
                  Field('Bio', 'text'),
                  Field('Favorite_Movie', 'text'),
                ],
                form_name='Edit Profile',
                formstyle=FormStyleBulma
            )
    if form.accepted:
        db.profiles.update_or_insert(
            (db.profiles.user_email == auth.current_user.get('email')),
            user_email=auth.current_user.get('email'),
            photo=form.vars.get('Photo'),
            bio=form.vars.get('Bio'),
            favMovie=form.vars.get('Bio')
        )
        redirect(URL('index')) 
    return dict(form=form)
#    return dict(profile_id=profile_id, formBio=bio, formMovie=favMovie, formImg=img)

@action('update_profile', method=['GET', 'POST'])
@action.uses(auth.user, db, session)
def update_profile():
    profile=db(db.profiles.user_email == auth.current_user.get('email')).select().first()
    pID=profile.id
    form  = Form(db.profiles, dbio=False, form_name='myProfile') 
    p = db.profiles[pID]
    profile_id = p.update_record(photo=form.vars['photo'], bio=form.vars['bio'], favMovie=form.vars['favMovie'])
    return dict(profile_id=profile_id)
	
#---------------------------------  ---------------  ---------- Friend Request
@action('add_friend', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def add_friend():
    requester = auth.current_user.get('id')
    user_requested = request.json.get('user_requested')
    db.friends.insert(requester=requester, user_requested=user_requested, status=2)
    db.friends.insert(requester=user_requested, user_requested=requester, status=3)
    return "ok"

@action('accept_friend', method="POST")
@action.uses(url_signer.verify(), db, auth.user)
def accept_friend():
    print("---> in accept friend")
    user_requested = auth.current_user.get('id')
    requester = request.json.get('requester')
    friendship_entry = db((db.friends.requester == requester) &
                        (db.friends.user_requested == user_requested)).select().first()
    if friendship_entry is not None:
        is_friendship = db.friends.update_or_insert(
                            ((db.friends.requester == requester) & (db.friends.user_requested == user_requested)),
                            status = 4
                        )
        db.friends.update_or_insert(
            ((db.friends.requester == user_requested) & (db.friends.user_requested == requester)),
            status=4
        )
        if user_requested < int(requester): #fer
            print("---> inserting in db a:", user_requested)
            print("---> inserting in db b:", requester)
            db.conversation.update_or_insert(
                interlocutor_a=user_requested,
                interlocutor_b=int(requester),
            )
        else:
            print("---> inserting in db a:", user_requested)
            print("---> inserting in db b:", requester)
            db.conversation.update_or_insert(
                interlocutor_a=int(requester),
                interlocutor_b=user_requested,
            )
        db.contacts.update_or_insert(
            friend_a=user_requested,
            friend_b=requester,
        ) # now
        db.contacts.update_or_insert(
            friend_a=requester,
            friend_b=user_requested,
        ) # now
    else:
        is_friendship = 0
    return is_friendship

#---------------------------------  ---------------  ---------- User Profile

#@action('save_profile', method=['GET', 'POST'])
#@action.uses(auth.user, db, session)
#def save_profile():
#    form = Form(db.profiles, form_name='myProfile')
#    p = db.profiles[form.vars['id']]
#    profile_id = p.update_record(user_email=auth.current_user.get('email'))
#    return dict(profile_id=profile_id)
	
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
    sender = request.json.get('sender')
    receiver = request.json.get('receiver')
    content = request.json.get('content')
    timestamp = request.json.get('timestamp')
    db.messages.insert(sender=sender, receiver=receiver, content=content, ts=datetime.datetime.utcnow())
    return "ok"

@action('fetch_msg')
@action.uses(url_signer.verify(), db)
def fetch_msg():
    sender = request.params.get('sender')
    receiver = request.params.get('receiver')
    msgs = []
    for msg in db(((db.messages.sender == sender) & (db.messages.receiver == receiver)) | ((db.messages.sender == receiver) & 
             (db.messages.receiver == sender))).select(orderby=db.messages.ts):
                    msgs.append({ 'sender': msg.sender, 'receiver': msg.receiver, 'content': msg.content, 'timestamp': msg.ts }) 
    return dict(msgs=msgs)

# ------------------------------------- ------------ ------ Chat box

@action("load_messages/<contact_id>")
@action.uses(auth.user, db)
def load_messages(contact_id):
    print("messages")
    user = auth.get_user() or redirect(URL('auth/login'))
    user_id = user['id']
    if int(contact_id) < user_id:
        interlocutor_1 = int(contact_id)
        interlocutor_2 = user_id
    else:
        interlocutor_1 = user_id
        interlocutor_2 = int(contact_id)
    convo_row = \
        db((db.conversation.interlocutor_a == interlocutor_1)\
         & (db.conversation.interlocutor_b == interlocutor_2))\
            .select(db.conversation.id)\
            .first()
    if convo_row == None:
        return dict(messages=[])
    if convo_row.id == None:
        return dict(messages=[])
    messages = db(db.message.convo == convo_row.id)\
               .select(db.message.ALL, orderby=db.message.ts)\
               .as_list()
    return dict(messages=messages)

@action("generate_ticket")
@action.uses(auth.user, db)
def generate_ticket():
    print("---> tickets")
    user = auth.get_user() or redirect(URL('auth/login'))
    ticket = {
        "client_ip": request.environ.get('REMOTE_ADDR'),
        "user_id": str(user['id']),
        "ts": str(datetime.datetime.utcnow()),
    }
    ticket_id = db.tickets.insert(
        ip=ticket['client_ip'],
        user_id=ticket['user_id'],
        ts=ticket['ts'],
        claimed=False
    )
    return dict(ticket=ticket, ticket_id=ticket_id)

@action("get_contacts")
@action.uses(auth.user, db)
def get_contacts():
    print("---> contacts")
    user = auth.get_user() or redirect(URL('auth/login'))
    user_id = user['id']
    contacts = []
    rows = \
        db(db.contacts.friend_a == user_id).select().as_list()
    for contact_pair in rows:
        friend_b = db.auth_user[contact_pair.get('friend_b')]
        friend_id = contact_pair.get('friend_b')
        name = "{} {}".format(friend_b.get('first_name'), friend_b.get('last_name'))
        contacts.append({"name": name, "id": friend_id})
    print("---> contacts:", contacts)
    return dict(contacts=contacts)

@action('chatsocket')
@action.uses(db) 
def chat():
    print("---> chat socket")
    # Validate the websocket ticket
    print("---> request environ:", request.environ)
    ws = request.environ.get('wsgi.websocket')
    ticket_payload_serialized = ws.receive()
    if ticket_payload_serialized == None:
        return
    ticket_payload = json.loads(ticket_payload_serialized) 
    ticket = ticket_payload.get('content')
    ticket_id = ticket_payload.get('ticket_id')
    type("timestamp: {}".format(ticket['ts']))
    row = db.tickets[ticket_id]
    if row == None:
        return
    if row.get('ip') != ticket.get('client_ip'):
        return
    if row.get('user_id') != ticket.get('user_id'):
        return
    if row.get('ts') != ticket.get('ts'):
        return
    if row.get('claimed') == True:
        return

    db.tickets[ticket_id] = dict(claimed=True)
    # Register the websocket along with a corresponding user id
    user_id = int(ticket['user_id'])
    users[user_id] = ws

    # Looping so that this socket is useful
    while True:
        #Recieve the payload from the client, which would be a message
        payload = ws.receive()
        if payload is not None:
            decoded_payload = json.loads(payload)
            msg = decoded_payload['content']
            recipient_id = decoded_payload['recipient_id']
            if msg == None:
                break
            if recipient_id == None:
                break
            if int(recipient_id) == user_id:
                break

            # check if recipient exists and is not user sending to self
            rows = db(db.auth_user.id == recipient_id).select()
            recipient_user = rows.first()
            if recipient_user == None:
                break
                
            # Setting these so the ids are unique in the convo DB
            if int(recipient_id) < user_id:
                interlocutor_1 = int(recipient_id)
                interlocutor_2 = user_id
            else:
                interlocutor_1 = user_id
                interlocutor_2 = int(recipient_id)
            # Updating in case the convo doesn't exist already
            convo_id = db.conversation.update_or_insert(
                ((db.conversation.interlocutor_a == interlocutor_1) &\
                 (db.conversation.interlocutor_b == interlocutor_2)),
                interlocutor_a=interlocutor_1,
                interlocutor_b=interlocutor_2,
            )
            # The other way of doing this isn't working for some reason
            rows1 = db((db.conversation.interlocutor_a == interlocutor_1) & (db.conversation.interlocutor_b == interlocutor_2)).select()
            convo_id = rows1.first().id

            # Save the message in the DB
            message_id = db.message.insert(
                convo=convo_id,
                content=msg,
                recipient_id=int(recipient_id),
            )

            # Create the payload for the client
            message_2_send = db.message[message_id]
            out_payload = json.dumps(
                {
                    'recipient_id': int(recipient_id),
                    'message': msg,
                    'ts': message_2_send.ts.isoformat()
                }
            )
            
            # Send the payload to the logged in interlocutors
            if users.get(interlocutor_1) != None: 
                users.get(interlocutor_1).send(out_payload)
            if users.get(interlocutor_2) != None: 
                users.get(interlocutor_2).send(out_payload)
        else:
            break
    # No payload or some exit condition
    users[user_id] = None
