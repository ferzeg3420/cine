let app = {};

let init = (app) => {
    app.data = {
        user_movie: "",
        is_loading: false,
        rows: [],
        page: 'search',
        last_page: 'search',
        is_show_menu: false,
        no_results: false,
        no_results_descript: false,
        google_link: "https://www.google.com/search?q=popular+movie",
        user_descript: ""
    };

    app.fetch_rec = () => {
        app.vue.is_loading = true;
        setTimeout(() => {
            axios.get(load_rec_url, {params: {"user_movie": app.vue.user_movie}}).then((result) => {
                console.log(result);
                res = app.vue.reenum(result.data.rows);
                if (res.length == 0) {
                    app.vue.no_results = true;
                    app.vue.is_loading = false;
                } else {
                    app.vue.rows = res;
                    app.vue.last_page = app.vue.page;
                    app.vue.page = 'list';
                }
            })
                .catch(function () {
                    app.goto('search');
                    app.vue.no_results = true;
                    app.vue.is_loading = false;
                });
        }, 300);
    };

    app.fetch_descript_rec = () => {
        app.vue.is_loading = true;
        console.log("fetch_descript_rec");
        setTimeout(() => {
            axios.get(load_rec_descript_url, {params: {"description": app.vue.user_descript}}).then((result) => {
                console.log("fetch_descript_rec result:", result);
                res = app.vue.reenum(result.data.rows);
                app.vue.rows = res;
                app.vue.last_page = app.vue.page;
                app.vue.user_movie = "your description";
                app.vue.page = 'list';
            }).catch(function () {
                app.goto('search_descript');
                app.vue.no_results_descript = true;
                app.vue.is_loading = false;
            });
        }, 300);
    };

    app.goto = (destination) => {
        console.log("goto:", destination);
        app.vue.last_page = app.vue.page;
        if (destination === 'search') {
            app.reset_input();
        }
        console.log("goto's last page", app.vue.last_page);
        app.vue.page = destination;
        app.vue.is_show_menu = false;
        app.vue.is_loading = false;
    };

    app.go_last_page = () => {
        app.vue.is_loading = false;
        console.log("going to", app.vue.last_page);
        if (app.vue.last_page === 'search_descript'
            || app.vue.last_page === 'search') {
            app.reset_input();
        }
        console.log("goto's from:", app.vue.page);
        let temp = app.vue.page;
        app.vue.page = app.vue.last_page;
        app.vue.last_page = temp;
        console.log("goto's last page", app.vue.last_page);
    };

    app.make_google_link = (title) => {
        formatted = (title.split(" ")).join("+");
        return "https://google.com/search?q=" + formatted;
    };

    app.reset_errors = () => {
        app.vue.no_results = false;
    };

    app.reset_errors_descript = () => {
        app.vue.no_results_descript = false;
    };

    app.reenum = (a) => {
        console.log("enumerating");
        let k = 0;
        a.map((e) => {e._idx = k++;});
        return a;
    };

    app.reset_input = () => {
        app.vue.user_movie = "";
        app.vue.user_descript = "";
    };

    app.favorite = (r_idx) => {
        console.log("set favorite: row: ", r_idx );
        app.vue.rows[r_idx].is_favorite = 1;
        axios.post(set_favorite_url, {movie_id: app.vue.rows[r_idx].movie_id, is_favorite: 1})
            .then(() => {app.vue.rows = app.reenum(app.vue.rows);})
    };

    app.unfavorite = (r_idx) => {
        console.log("set favorite: row: ", r_idx );
        app.vue.rows[r_idx].is_favorite = 0;
        axios.post(set_favorite_url, {movie_id: app.vue.rows[r_idx].movie_id, is_favorite: 0})
            .then(() => {app.vue.rows = app.reenum(app.vue.rows);})
    };

    app.set_rating = (r_idx, num_stars) => {
        console.log("set rating: row: ", r_idx, "| num_stars: ", num_stars );
        let movie = app.vue.rows[r_idx];
        movie.rating = num_stars;
        // Sets the stars on the server.
        axios.post(set_rating_url, {movie_id: movie.movie_id, rating: num_stars});
    };

    app.stars_out = (r_idx) => {
        console.log("stars out");
        app.vue.rows[r_idx].num_stars_display =
            app.vue.rows[r_idx].rating;
    };

    app.stars_over = (r_idx, num_stars) => {
        console.log("stars over");
        app.vue.rows[r_idx].num_stars_display =
            num_stars;
    };

    app.cine_link = (movie_id) => {
        console.log("cine_link: ");
        console.log(window.location.href);
        new_link = window.location.href + '/../movie_info_page/' + movie_id;
        return new_link;
    };

    app.toggle_show_menu = () => {
        if (app.vue.is_show_menu === true) {
            app.vue.is_show_menu = false;
        } else {
            app.vue.is_show_menu = true;
        }
    };

    app.fetch_title = () => {
        app.vue.is_loading = true;
        setTimeout(() => {
            axios.get(find_title_url, {params: {"user_movie": app.vue.user_movie}}).then((result) => {
                console.log(result);
                res = app.vue.reenum(result.data.rows);
                app.vue.rows = res;
                app.vue.last_page = app.vue.page;
                app.vue.page = 'list';
            })
                .catch(function () {
                    app.goto('search');
                    app.vue.no_results = true;
                    app.vue.is_loading = false;
                });
        }, 300);
    };

    app.methods = {
        fetch_rec: app.fetch_rec,
        fetch_descript_rec: app.fetch_descript_rec,
        goto: app.goto,
        go_last_page: app.go_last_page,
        reenum: app.reenum,
        reset_input: app.reset_input,
        reset_errors: app.reset_errors,
        reset_errors_descript: app.reset_errors_descript,
        make_google_link: app.make_google_link,
        favorite: app.favorite,
        unfavorite: app.unfavorite,
        set_rating: app.set_rating,
        stars_out: app.stars_out,
        stars_over: app.stars_over,
        cine_link: app.cine_link,
        toggle_show_menu: app.toggle_show_menu,
        fetch_title: app.fetch_title
    };

    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    app.init = () => {
        app.data.user_movie = "";
        rows = [];
    };

    app.init();
};

init(app);