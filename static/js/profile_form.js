var app = new Vue({
    el: "#app",
    data() {
        return {
            photo: null,
            bio: "",
            favMovie: ""
        };
    },
    methods: {
        handleFileUpload(event) {
            this.photo = this.$refs.photo.files[0];
        },
        createUserProfile: function() {
            console.log("ping");
            let formData = new FormData();
            formData.append("_formname", "myProfile");
            formData.append("photo", this.photo);
            formData.append("bio", this.bio);
            formData.append("favMovie", this.favMovie);

            axios.post("../save_profile", formData).then(
                function(result) {
                    console.log(result);
                    window.location = "../index";
                },
                function(error) {
                    console.log("error");
                }
            );
            for (var pair of formData.entries()) {
                console.log(pair[0] + ", " + pair[1]);
            }
        },
        goBack: function() {
            window.location = "../index";
        }
    }
});
