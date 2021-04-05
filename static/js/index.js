let app = {};

let init = (app) => {
    app.data = {
        page: "",
        favorites: [],
        rec_movies: [],
        rec_people: [],
        friends: [],
        reviews: [],

        trailer_link: "",

        is_show_more_favs_opt: false,
        is_hide_favs_opt: false,
        is_no_favs: false,

        is_show_more_reviews_opt: false,
        is_hide_reviews_opt: false,
        is_no_reviews: false,

        is_show_more_rec_people_opt: false,
        is_hide_rec_people_opt: false,
        is_no_rec_people: false,

        is_show_more_friends_opt: false,
        is_hide_friends_opt: false,

        is_show_more_reviews_opt: false,
        is_hide_reviews_opt: false,
      
        showModal: false,
        showModalFor: 0
    };
  
    Vue.component("my-modal", {
    template: `
        <div class="modal is-active">
            <div class="modal-background">
            </div>
            <div class="modal-content">
                <div class="box">
                    <slot></slot>
                </div>
            </div>
            <button class="modal-close" @click="$emit('close')">
            </button>
        </div>
    `
    });
  
    Vue.component("chatbox", {
    props: {
      sender: Number,
      receiver: String,
      receiver_id: Number
    },
    template: `          
      <div>
        <h1 class="title">{{ receiver }}</h1> 
        </textarea>
        <div class="box" :message="messages">
          <p class="has-text-right has-text-link is-size-6" v-if="sender==messages[0].sender && messages.content!==undefined">
            {{messages[0].content}}
          </p>
          <p class="has-text-left has-text-grey-dark is-size-6" v-else-if="sender!=messages[0].sender && messages.content!==undefined">
            {{messages[0].content}}
          </p>
          <p class="has-text-right has-text-link is-size-6" v-if="sender!=messages[0].sender && messages.content!==undefined">
            {{messages[1].content}}
          </p>
        </div> 
        <span>
            <textarea class="textarea" rows="1" placeholder="Type a message..." v-model="messages.content" v-if="clear">
            </textarea>
            <br>
            <button class="button is-info" @click="save_msg(receiver_id)">
                <span>Send</span>
                <span class="icon is-small">
                    <i class="far fa-paper-plane"></i>
                </span>
            </button>
        </span>
      </div>
    `,
    data: function() {
      return {
        clear: true,
        messages: [
          {
            content: "",
            sender: "",
            receiver: "",
            timestamp: ""
          }
        ]
      };
    },
    created() {
      setInterval(this.getNow, 1000);
    },
    methods: {
      save_msg: function(receiver_id) {
        this.messages.receiver = receiver_id;
        this.messages.sender = this.sender;
        setInterval(() => {
          this.getNow();
        }, 1000);
        this.messages.push({
          sender: this.messages.sender,
          receiver: this.messages.receiver,
          content: this.messages.content,
          timestamp: this.messages.timestamp
        });
        axios.post(save_msg_url, {
          sender: this.messages.sender,
          receiver: this.messages.receiver,
          content: this.messages.content,
          timestamp: this.messages.timestamp
        });
        this.clear = false;
        this.$nextTick(() => {
          this.messages.content = "";
          this.clear = true;
        });
        this.fetchMessages();
      },
      getNow: function() {
        const today = new Date();
        const date =
          today.getFullYear() +
          "-" +
          (today.getMonth() + 1) +
          "-" +
          today.getDate();
        const time =
          today.getHours() +
          ":" +
          today.getMinutes() +
          ":" +
          today.getSeconds();
        const dateTime = date + " " + time;
        this.messages.timestamp = dateTime;
      },
      fetchMessages: function() {
        axios
          .get(fetch_msg_url, {
            params: {
              sender: this.messages.sender,
              receiver: this.messages.receiver
            }
          })
          .then(result => {
            for (let i = 0; i < result.data.msgs.length; i++) {
              this.$set(this.messages, i, {
                sender: result.data.msgs[i].sender,
                receiver: result.data.msgs[i].receiver,
                content: result.data.msgs[i].content,
                timestamp: result.data.msgs[i].timestamp
              });
            }
          });
      }
    }
  });

    app.goto = (destination) => {
        app.vue.page = destination;
    };

    app.enumerate = (a) => {
        let k = 0;
        a.map((e) => {e._idx = k++;});
        return a;
    };

    app.cine_link = (movie_id) => {
        new_link = window.location.href + '/../movie_info_page/' + movie_id;
        return new_link;
    };

    app.set_rating = (r_idx, num_stars) => {
        //console.log("set rating: row: ", r_idx, "| num_stars: ", num_stars );
        let movie = app.vue.reviews[r_idx];
        movie.rating = num_stars;
        // Sets the stars on the server.
        axios.post(set_rating_url, {movie_id: movie.movie_id, rating: num_stars});
    };

    app.stars_out = (r_idx) => {
        //console.log("stars out");
        app.vue.reviews[r_idx].num_stars_display =
            app.vue.reviews[r_idx].rating;
    };

    app.stars_over = (r_idx, num_stars) => {
        //console.log("stars over");
        app.vue.reviews[r_idx].num_stars_display =
            num_stars;
    };

    app.show_all_favs = () => {
        //console.log("show all favs");
        axios.get(load_fav_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                app.vue.is_hide_favs_opt = true;
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_favs = true;
            }
            app.vue.favorites = app.vue.enumerate(result.data.rows);
            app.vue.is_show_more_favs_opt = false;
        });
    };

    app.hide_favs = () => {
        //console.log("hide favs");
        axios.get(load_fav_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                console.log("pring");
                app.vue.is_show_more_favs_opt = true;
                let result_rows = app.vue.enumerate(result.data.rows);
                app.vue.favorites = [];
                for (let i = 0; i < 5; i++) {
                    app.vue.favorites[i] = result_rows[i];
                }
            } else {
                app.vue.favorites = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_favs = true;
            }
            app.vue.is_hide_favs_opt = false;
        });
    };

    app.show_all_rec_people = () => {
        console.log("show all recommended people");
        axios.get(load_rec_people_url, {params: {"user_movie": "moana"}}).then( (result) => {
            app.vue.is_show_more_rec_people_opt = false;
            if (result.data.rows.length > 5) {
                app.vue.is_hide_rec_people_opt = true;
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_rec_people = true;
            }
            app.vue.rec_people = app.vue.enumerate(result.data.rows);
        });
    };

    app.hide_rec_people = () => {
        console.log("hide recommended people");
        axios.get(load_rec_people_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                console.log("pring");
                app.vue.is_show_more_rec_people_opt = true;
                let result_rows = app.vue.enumerate(result.data.rows);
                app.vue.rec_people = [];
                for (let i = 0; i < 5; i++) {
                    app.vue.rec_people[i] = result_rows[i];
                }
            } else {
                app.vue.rec_people = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_rec_people = true;
            }
            app.vue.is_hide_rec_people_opt = false;
        });
    };

    app.show_all_friends = () => {
        //console.log("show all friends");
        axios.get(load_friends_url, {params: {"user_movie": "moana"}}).then( (result) => {
            app.vue.is_show_more_friends_opt = false;
            is_hide_friends_opt = true;
            if (result.data.rows.length > 5) {
                app.vue.is_hide_friends_opt = true;
            }
            app.vue.friends = app.vue.enumerate(result.data.rows);
        });
    };

    app.hide_friends = () => {
        //console.log("hide friends");
        axios.get(load_friends_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                console.log("pring");
                app.vue.is_show_more_friends_opt = true;
                let result_rows = app.vue.enumerate(result.data.rows);
                app.vue.friends = [];
                for (let i = 0; i < 5; i++) {
                    app.vue.friends[i] = result_rows[i];
                }
            } else {
                app.vue.friends = app.vue.enumerate(result.data.rows);
            }
            app.vue.is_hide_friends_opt = false;
        });
    };

    app.show_all_reviews = () => {
        //console.log("show all reviews");
        axios.get(load_reviews_url, {params: {"user_movie": "moana"}}).then( (result) => {
            app.vue.is_show_more_reviews_opt = false;
            is_hide_reviews_opt = true;
            if (result.data.rows.length > 5) {
                app.vue.is_hide_reviews_opt = true;
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_reviews = true;
            }
            app.vue.reviews = app.vue.enumerate(result.data.rows);
        });
    };

    app.hide_reviews = () => {
        //console.log("hide reviews");
        axios.get(load_reviews_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                console.log("pring");
                app.vue.is_show_more_reviews_opt = true;
                let result_rows = app.vue.enumerate(result.data.rows);
                app.vue.reviews = [];
                for (let i = 0; i < 5; i++) {
                    app.vue.reviews[i] = result_rows[i];
                }
            } else {
                app.vue.reviews = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_reviews = true;
            }
            app.vue.is_hide_reviews_opt = false;
        });
    };

    app.reload_rand_recs = () => {
        axios.get(load_rand_rec_url, {params: {"user_movie": "moana"}}).then( (result) => {
            //console.log(result);
            app.vue.rec_movies = app.vue.enumerate(result.data.rows);
        });
    };
  
    app.add_friend = user_id => {
        axios.post(add_friend_url, { user_requested: user_id });
        location.reload();
    };

    app.accept_friend = user_id => {
        axios.post(accept_friend_url, { requester: user_id });
        location.reload();
    };

    app.methods = {
        goto: app.goto,
        enumerate: app.enumerate,
        cine_link: app.cine_link,
        set_rating: app.set_rating,
        stars_out: app.stars_out,
        stars_over: app.stars_over,
        show_all_favs: app.show_all_favs,
        hide_favs: app.hide_favs,
        show_all_rec_people: app.show_all_rec_people,
        hide_rec_people: app.hide_rec_people,
        show_all_friends: app.show_all_friends,
        hide_friends: app.hide_friends,
        show_all_reviews: app.show_all_reviews,
        hide_reviews: app.hide_reviews,
        reload_rand_recs: app.reload_rand_recs,
        add_friend: app.add_friend,
        accept_friend: app.accept_friend
    };

    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    app.init = () => {
        axios.get(load_rand_rec_url, {params: {"user_movie": "moana"}}).then( (result) => {
            //console.log(result);
            app.vue.rec_movies = app.vue.enumerate(result.data.rows);
            app.vue.trailer_link = result.data.trailer;
        });
        axios.get(load_fav_url, {params: {"user_movie": "moana"}}).then( (result) => {
            //console.log(result);
            if (result.data.rows.length > 5) {
                app.vue.is_show_more_favs_opt = true;
                app.vue.is_hide_favs_opt =  false;
                let result_rows = app.vue.enumerate(result.data.rows);
                for (let i = 0; i < 5; i++) {
                    app.vue.favorites[i] = result_rows[i];
                }
            } else {
                app.vue.favorites = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_favs = true;
            }
        });
        axios.get(load_friends_url, {params: {"user_movie": "moana"}}).then( (result) => {
            //console.log(result);
            if (result.data.rows.length > 5) {
                app.vue.is_show_more_friends_opt = true;
                app.vue.is_hide_friends_opt =  false;
                let result_rows = app.vue.enumerate(result.data.rows);
                for (let i = 0; i < 5; i++) {
                    app.vue.friends[i] = result_rows[i];
                }
            } else {
                app.vue.friends = app.vue.enumerate(result.data.rows);
            }
        });
        axios.get(load_rec_people_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                app.vue.is_show_more_rec_people_opt = true;
                app.vue.is_hide_rec_people_opt =  false;
                let result_rows = app.vue.enumerate(result.data.rows);
                for (let i = 0; i < 5; i++) {
                    app.vue.rec_people[i] = result_rows[i];
                }
            } else {
                app.vue.rec_people = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_rec_people = true;
            }
        });
        axios.get(load_reviews_url, {params: {"user_movie": "moana"}}).then( (result) => {
            if (result.data.rows.length > 5) {
                app.vue.is_show_more_reviews_opt = true;
                app.vue.is_hide_reviews_opt =  false;
                let result_rows = app.vue.enumerate(result.data.rows);
                for (let i = 0; i < 5; i++) {
                    app.vue.reviews[i] = result_rows[i];
                }
            } else {
                app.vue.reviews = app.vue.enumerate(result.data.rows);
            }
            if (result.data.rows.length == 0) {
                app.vue.is_no_reviews = true;
            }
        });
    };

    app.init();
};

init(app);
