// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        mode: "no_textarea",
        new_review_text: "",
        reviews: [],
        is_favorite: "",
        movie_title: "",
        description: "",
        rating: 0,
        rating_sav: 0,
        num_stars_display: "",
        clapper_count: 0,
        is_only_review_text_empty: false,
        is_only_rating_empty: false,
        is_review_text_and_rating_empty: false,
    };

    app.change_mode = (mode) => {
        app.vue.mode = mode;
    };

    // Use this function to reindex the reviews, when you get them, and when
    // you add / delete one of them.
    app.reindex = (a) => {
        let idx = 0;
        for (p of a) {
            p._idx = idx++;
            console.log(p);
            // Add here whatever other attributes should be part of a review.
            p.show_ppl_who_liked_review = false;
            p.likers = "";
            p.haters = "";
            p.expired_likers = true;
        }
        return a;
    };

    app.reset_textarea = () => {
        app.vue.new_review_text = "";
    };

    app.add_review = () => {
        console.log(app.vue.new_review_text);

        if (app.vue.new_review_text.trim().length == 0 && app.vue.rating == 0) {
            app.vue.is_review_text_and_rating_empty = true;
            return;
        }
        if (app.vue.rating == 0) {
            app.vue.is_only_rating_empty = true;
            return;
        }
        if (app.vue.new_review_text.trim().length == 0) {
            app.vue.is_only_review_text_empty = true;
            return;
        }

        //send the clapperboards(stars)
        axios.post(set_rating_url, {movie_id: _movie_id, rating: app.vue.rating});
        app.vue.clapper_count += app.vue.rating - app.vue.rating_sav;
        app.vue.rating_sav = app.vue.rating;


        axios.post(add_review_url, {movie_id:_movie_id, review_text: app.vue.new_review_text}).then(function (response) {
            // response.data contains the response.
            // response has other fields, such as status, etc; see them in the log.
            let res = app.reindex(response.data.reviews);
            for (let i of res) {
                console.log(i);
            }
            app.vue.reviews = res;
            app.reset_textarea();
        })
    };

    app.delete_review = (_review_id) => {
        axios.post(delete_review_url, {review_id: _review_id, movie_id:_movie_id})
            .then(function (response) {
            let res = app.reindex(response.data.reviews);
            console.log("ping");
            for (let i of res) {
                console.log(i);
            }
            app.vue.reviews = res;
        })
    };

    app.get_movie_info = (movie_id) => {
        axios.get(movie_info_url, {params: {"movie_id": movie_id}} ).then((result) => {
            app.vue.movie_title = result.data.title;
            app.vue.description = result.data.description;
            app.vue.is_favorite = result.data.is_favorite;
            app.vue.rating = result.data.rating;
            app.vue.rating_sav = result.data.rating;
            app.vue.num_stars_display = result.data.rating;
            app.vue.clapper_count = result.data.clapper_count
        });
    };

    app.favorite = () => {
        app.vue.is_favorite = 1;
        axios.post(set_favorite_url, {movie_id: _movie_id, is_favorite: 1});
    };

    app.unfavorite = () => {
        app.vue.is_favorite = 0;
        axios.post(set_favorite_url, {movie_id: _movie_id, is_favorite: 0});
    };

    app.set_rating = (num_stars) => {
        console.log("setting the rating.");
        app.vue.clear_error_flags();
        app.vue.rating = num_stars;
    };

    app.stars_out = () => {
        app.vue.num_stars_display = app.vue.rating;
    };

    app.stars_over = (num_stars) => {
        console.log("stars over");
        app.vue.num_stars_display = num_stars;
    };

    app.amazon_link = (movie_title)  => {
        formatted_title = movie_title.split(' ').join('+');
        new_link = 'https://www.amazon.com/s?k=' + formatted_title + '&i=movies-tv';
        return new_link;
    };

    app.netflix_link = (movie_title)  => {
        formatted_title = movie_title.split(' ').join('%20');
        new_link = 'https://www.netflix.com/search?q=' + formatted_title;
        return new_link;
    };

    app.google_link = (movie_title)  => {
        formatted_title = movie_title.split(' ').join('+');
        new_link = 'https://www.google.com/search?q=' + formatted_title;
        return new_link;
    };

    app.clear_error_flags = () => {
        app.vue.is_review_text_and_rating_empty = false;
        app.vue.is_only_rating_empty = false;
        app.vue.is_only_review_text_empty = false;
    };

    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        reindex: app.reindex,
        change_mode: app.change_mode,
        add_review: app.add_review,
        delete_review: app.delete_review,
        reset_textarea: app.reset_textarea,
        get_movie_info: app.get_movie_info,
        favorite: app.favorite,
        unfavorite: app.unfavorite,
        set_rating: app.set_rating,
        stars_out: app.stars_out,
        stars_over: app.stars_over,
        amazon_link: app.amazon_link,
        netflix_link: app.netflix_link,
        google_link: app.google_link,
        clear_error_flags: app.clear_error_flags,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        app.vue.get_movie_info(_movie_id);
        axios.get(get_reviews_url, {params: {"movie_id": _movie_id}}).then((result) => {
            let res = app.vue.reindex(result.data.reviews);
            console.log("ping");
            for (let i of res) {
                console.log(i);
            }
            app.vue.reviews = res;
        })
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
