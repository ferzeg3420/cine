let app = {};

let init = (app) => {
    app.data = {
        socketHitboxes: [],
        outerHitboxes: [],

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
        let movie = app.vue.reviews[r_idx];
        movie.rating = num_stars;
        axios.post(set_rating_url, 
            {
                movie_id: movie.movie_id, rating: num_stars
            }
        );
    };

    app.stars_out = (r_idx) => {
        app.vue.reviews[r_idx].num_stars_display =
            app.vue.reviews[r_idx].rating;
    };

    app.stars_over = (r_idx, num_stars) => {
        app.vue.reviews[r_idx].num_stars_display =
            num_stars;
    };

    app.show_all_favs = () => {
        axios.get(
            load_fav_url,
            {
                params: {"user_movie": "moana"}
            }
        ).then( (result) => {
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
        axios.get(load_fav_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
            if (result.data.rows.length > 5) {
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
        axios.get(load_rec_people_url, 
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        axios.get(load_rec_people_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
            if (result.data.rows.length > 5) {
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
        axios.get(load_friends_url,
            {params: {"user_movie": "moana"}})
        .then( (result) => {
            app.vue.is_show_more_friends_opt = false;
            is_hide_friends_opt = true;
            if (result.data.rows.length > 5) {
                app.vue.is_hide_friends_opt = true;
            }
            app.vue.friends = app.vue.enumerate(result.data.rows);
        });
    };

    app.hide_friends = () => {
        axios.get(load_friends_url, 
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
            if (result.data.rows.length > 5) {
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
        axios.get(load_reviews_url, 
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        axios.get(load_reviews_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
            if (result.data.rows.length > 5) {
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
        axios.get(load_rand_rec_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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

    app.clickHandler = (e, fromSocketId, isInnerDiv) => {
        let fromSocket = 
            document.getElementById(fromSocketId);
        let draggedElement = fromSocket.firstElementChild;

        let positionSave = draggedElement.style.position;
        let opacitySave = draggedElement.style.opacity;
        let zIndexSave = draggedElement.style.zIndex;
        let topSave = draggedElement.style.top;
        let leftSave = draggedElement.style.left;
    
        let rect = draggedElement.getBoundingClientRect();

        let fromSocketHeightSav = fromSocket.style.height;
        fromSocket.style.height = rect.height + "px";

        let xOffset = e.clientX - rect.left;
        let yOffset = e.clientY - rect.top;
  
        let verticalScroll = window.scrollY;
        let horizontalScroll = window.scrollX;

        draggedElement.style.position = "absolute";
        draggedElement.style.opacity = "0.9";
        draggedElement.style.zIndex = "99";
        if( isInnerDiv ) {
            draggedElement.style.top = (rect.top + verticalScroll) + "px";
        }
        else {
            draggedElement.style.left = (rect.left + horizontalScroll) + "px";
        }
        let hitboxes = 
            (isInnerDiv)?
                app.vue.socketHitboxes
                :app.vue.outerHitboxes;

        let side = "";
        for( let iter of hitboxes ) {
            let rectIter = iter.elmn.getBoundingClientRect();
            if( iter.elmn.id === fromSocketId ) {
                side = iter.side;
            }
            let newTop =
                rectIter.top
                + verticalScroll
                + ((rectIter.bottom - rectIter.top) / 2)
                - ((rectIter.bottom - rectIter.top) / 5);
            let newBottom = 
                rectIter.top
                + verticalScroll
                + ((rectIter.bottom - rectIter.top) / 2)
                + ((rectIter.bottom - rectIter.top) / 5);
            let newLeft = 
                rectIter.left
                + ((rectIter.right - rectIter.left) / 2)
                - ((rectIter.bottom - rectIter.top) / 5);
            let newRight = 
                rectIter.left
                + ((rectIter.right - rectIter.left) / 2)
                + ((rectIter.bottom - rectIter.top) / 5);
            iter.top = newTop;
            iter.bottom = newBottom;
            iter.right = newRight;
            iter.left = newLeft;
        }
  
        document.onmouseup = (e) => {
            draggedElement.style.position = positionSave;
            draggedElement.style.opacity = opacitySave;
            draggedElement.style.zIndex = zIndexSave;
            draggedElement.style.top = topSave;
            draggedElement.style.left = leftSave;
            fromSocket.style.height = fromSocketHeightSav + "px";
  
            document.onmouseup = null;
            document.onmousemove = null;
            app.vue.saveOrders();
        };
  
        document.onmousemove = (e) => {
            e = e || window.event;
            e.preventDefault();
            if( isInnerDiv ) {
                draggedElement.style.top = (e.clientY + window.scrollY - yOffset) + "px";
            }
            else {
                draggedElement.style.left = (e.clientX + window.scrollY - xOffset) + "px";
            }
            let posY = e.clientY + window.scrollY;
            let posX = e.clientX + window.scrollX;
            for( let iter of hitboxes ) {
                if( isInnerDiv && (iter.side !== side ) ) {
                    continue;
                }
                if( isInnerDiv ) {
                    if( posY > iter.top
                        && posY < iter.bottom)
                    {
                        if( fromSocketId != iter.elmn.id ) {
                            app.vue.mouseenterHandler(fromSocketId,
                                                      iter.elmn.id,
                                                      side,
                                                      hitboxes);
                            break;
                        }
                    }
                }
                else { 
                    if( posX < iter.right
                        && posX > iter.left)
                    {
                        if( fromSocketId != iter.elmn.id ) {
                            app.vue.mouseenterHandler(fromSocketId,
                                                      iter.elmn.id,
                                                      side,
                                                      hitboxes);
                            break;
                        }
                    }
                }
            }
        };
    };
    app.mouseenterHandler = (fromSocketId,
                             targetSocketId,
                             side,
                             hitboxes) => {
        let fromSocket = document.getElementById(fromSocketId);
        let targetSocket = document.getElementById(targetSocketId);
        let fromSocketOrder = parseInt(fromSocket.style.order);
        let targetSocketOrder = parseInt(targetSocket.style.order);
        let isAdd = true;
        if( fromSocketOrder < targetSocketOrder ) {
            isAdd = false;
        }
        for( let iter of hitboxes ) {
            if( iter.side !== side ) {
                continue;
            }
            let elmnOrder = parseInt(iter.elmn.style.order);
            if( isAdd ) {
                if( elmnOrder >= targetSocketOrder
                  && elmnOrder < fromSocketOrder )
                {
                    iter.elmn.style.order = (elmnOrder + 1).toString();
                }
            }
            else {
                if( elmnOrder <= targetSocketOrder
                  && elmnOrder > fromSocketOrder )
                {
                    iter.elmn.style.order = (elmnOrder - 1).toString();
                }
            }
        }
        fromSocket.style.order = targetSocketOrder;
        for( let iter of hitboxes) {
            if( iter.side !== side ) {
                continue;
            }
            let rectIter = iter.elmn.getBoundingClientRect();
            let newTop =
                rectIter.top
                + ((rectIter.bottom - rectIter.top) / 2)
                - ((rectIter.bottom - rectIter.top) / 10);
            let newBottom = 
                rectIter.top
                + ((rectIter.bottom - rectIter.top) / 2)
                + ((rectIter.bottom - rectIter.top) / 10);
            let newLeft = 
                rectIter.left
                + ((rectIter.right - rectIter.left) / 2)
                - ((rectIter.bottom - rectIter.top) / 10);
            let newRight = 
                rectIter.left
                + ((rectIter.right - rectIter.left) / 2)
                + ((rectIter.bottom - rectIter.top) / 10);
            iter.top = newTop;
            iter.left = newLeft;
            iter.right = newRight;
            iter.bottom = newBottom;
        }
    };
    app.updateOrder = (newOrder) => {
        for(let i = 0; i < 3; i++) {
            let order = newOrder[i * 2];
            let side = newOrder[i * 2 + 1];
            app.vue.outerHitboxes[i].elmn.style.order = order;
            app.vue.outerHitboxes[i].side = side;
        }
        for(let i = 3; i < 9; i++) {
            let order = newOrder[i * 2];
            let side = newOrder[i * 2 + 1];
            app.vue.socketHitboxes[i - 3].elmn.style.order = order;
            app.vue.socketHitboxes[i - 3].side = side;
        }
    };

    app.getOrders = () => {
        axios.get(getOrderURL)
        .then((response) => {
            // handle success
            app.vue.updateOrder(response.data.divOrders);
        })
    };

    app.saveOrders = () => {
        let hitboxesPayload = [];
        for( let iter of app.vue.outerHitboxes) {
            hitboxesPayload.push(iter.elmn.style.order);
            hitboxesPayload.push(iter.side);
        }
        for( let iter of app.vue.socketHitboxes) {
            hitboxesPayload.push(iter.elmn.style.order);
            hitboxesPayload.push(iter.side);
        }
        axios.post(saveOrderURL, hitboxesPayload)
        .then(
            function (response) {
                //console.log("save orders:", response);
            }
        );
    };

    app.ping = () => {
        console.log("ping");
    }

    app.methods = {
        goto: app.goto,
        ping: app.ping,
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
        accept_friend: app.accept_friend,
        clickHandler: app.clickHandler,
        mouseenterHandler: app.mouseenterHandler,
        updateOrder: app.updateOrder,
        getOrders: app.getOrders,
        saveOrders: app.saveOrders
    };

    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    app.init = () => {
        app.vue.getOrders();
        const numItemsOnLeftSide = 3;
        let orderIter = 0;
        let side = "left";
        for( let socketId of ["ca", "cb", "cc", "cd", "ce", "cf"] ) {
            let socketElmn = document.getElementById(socketId);
            let socketChild = socketElmn.firstElementChild;
            socketElmn.style.height = socketChild.style.height;
            socketElmn.style.order = ((orderIter % numItemsOnLeftSide) + 1).toString(); 
            let side = (orderIter < numItemsOnLeftSide)? "left": "right";
            app.vue.socketHitboxes.push(
                {
                    "side": side,
                    "elmn": socketElmn,
                    "left": 0,
                    "right": 0,
                    "top": 0,
                    "bottom": 0,
                }
            );
            orderIter++;
        }
        const numOuterItems = 3;
        orderIter = 0;
        side = "none";
        for( let socketId of ["oca", "ocb", "occ"] ) {
            let socketElmn = document.getElementById(socketId);
            socketElmn.style.order = ((orderIter % numItemsOnLeftSide) + 1).toString(); 
            app.vue.outerHitboxes.push(
                {
                    "side": side,
                    "elmn": socketElmn,
                    "left": 0,
                    "right": 0,
                    "top": 0,
                    "bottom": 0,
                }
            );
            orderIter++;
        }
        axios.get(load_rand_rec_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
            app.vue.rec_movies = app.vue.enumerate(result.data.rows);
            app.vue.trailer_link = result.data.trailer;
        });
        axios.get(load_fav_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        axios.get(load_friends_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        axios.get(load_rec_people_url, 
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        axios.get(load_reviews_url,
            {params: {"user_movie": "moana"}}
        ).then( (result) => {
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
        setInterval( () => { 
            axios.get(checkNewInvitationsURL)
                 .then( (res) => {
                    if( res.data.reload_recs ) {
                       axios.get(load_friends_url,
                           {params: {"user_movie": "moana"}}
                       ).then( (result) => {
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
                        axios.get(load_rec_people_url, 
                            {params: {"user_movie": "moana"}}
                        ).then( (result) => {
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
                            else {
                                app.vue.is_no_rec_people = false;
                            }
                        });
                    }
                });
        }, 5000);
        app.vue.ping();
    };
    app.init();
};

init(app);
