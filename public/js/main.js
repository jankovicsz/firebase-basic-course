$(() => {
    // Global functions.
    const set = (key, value) => localStorage.setItem(key, value);
    const get = key => localStorage.getItem(key);
    const increase = el => set(el, parseInt(get(el), 10), +1);
    const decrease = el => set(el, parseInt(get(el), 10), -1);

    // Global variables.
    const Game = $('#g');
    let settings = {};
    let startGame = 0;
    let level = '';
    let timer = 0;
    let User = null;

    const startScreen = (text) => {
        Game
            .removeAttr('class')
            .empty();
        $('.logo').fadeIn(250);

        $('.c1').text(text.substring(0, 1));
        $('.c2').text(text.substring(1, 2));
        $('.c3').text(text.substring(2, 3));
        $('.c4').text(text.substring(3, 4));
    }

    // Init cards and set events.
    const initCards = () => {
        $('.logo .card:not(".twist")').on('click', (e) => {
            e.preventDefault();
            $(e.currentTarget)
                .toggleClass('active')
                .siblings('.card')
                .not('.twist')
                .removeClass('active');

            if ($(e.target).is('.playnow')) {
                $('.logo .card')
                    .last()
                    .addClass('active')
                    .siblings('.card')
                    .not('.twist')
                    .removeClass('active');
            }
        });
    };

    // Init keyboard events.
    const initKeyboard = () => {
        $(window).off().on('keyup', (e) => {
            // Pause. (p)
            if (e.keyCode === 80) {
                if (Game.attr('data-paused') === '1') {
                    Game.attr('data-paused', '0');
                    $('.timer').css('animation-play-state', 'running');
                    $('.pause').remove();
                } else {
                    Game.attr('data-paused', '1');
                    $('.timer').css('animation-play-state', 'paused');
                    Game.after('<div class="pause"></div>');
                }

            } else if (e.keyCode === 27) {
                // Escape. (esc)
                startScreen('flip');
                if (Game.attr('data-paused') === '1') {
                    Game.attr('data-paused', '0');
                    $('.pause').remove();
                }
                $(window).off();
            }
        });
    }

    // Init timer.
    const initTimer = (timer) => {
        $('<i class="timer"></i>')
            .prependTo(Game)
            .css({ animation: `timer ${timer}ms linear` })
            .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', e => {
                startScreen('fail');
            });
    };

    // Start game.
    $('.play').on('click', (ev) => {
        ev.preventDefault();
        initKeyboard();
        increase('flip_abandoned');
        $('.info').fadeOut();

        level = $(ev.currentTarget).data('level');
        timer = settings.difficulties[level].time * 1000;

        Game.addClass(level);

        $('.logo').fadeOut(250, () => {
            initBoard();
        });

        // Start timer.
        initTimer(timer);
    });

    // Init game board.
    const initBoard = () => {
        startGame = $.now();
        const obj = [];

        // Create and shuffle cards.
        for (let i = 0; i < settings.difficulties[level].cards; i++) {
            obj.push(i);
        }

        const shu = shuffle($.merge(obj, obj));
        const cardSize = 100 / Math.sqrt(shu.length);

        for (let i = 0; i < shu.length; i++) {
            let code = shu[i];
            code = code < 10 ? `0${code}` : code;
            code = code == 30 ? 10 : code;
            code = code == 31 ? 21 : code;
            $(
                `<div class="card" style="width:${cardSize}%;height:${cardSize}%;">` +
                `<div class="flipper"><div class="f"></div><div class="b" data-f="&#xf0${code};"></div></div>` +
                `</div>`
            ).appendTo(Game);
        }

        // Set card actions.
        Game.find('.card').on('mousedown', e => setCardActions(e));
    };

    // Actions on the clicked game card.
    const setCardActions = (e) => {
        if (Game.attr('data-paused') === '1') {
            return;
        }

        // Flip card.
        const data = $(e.currentTarget)
            .addClass('active')
            .find('.b')
            .attr('data-f');

        // More than one card is active.
        if (Game.find('.card.active').length > 1) {
            const to = setTimeout(() => {
                clearTimeout(to);
                const thisCard = Game.find(`.active .b[data-f=${data}]`);

                if (thisCard.length > 1) {
                    thisCard
                        .parents('.card')
                        .toggleClass('active card found')
                        .empty();

                    // Win game.
                    if (!Game.find('.card').length) {
                        const time = $.now() - startGame;
                        startScreen('nice');
                    }
                } else {
                    Game.find('.card.active').removeClass('active');
                }
            }, 401);
        }
    };

    // Shuffle cards.
    const shuffle = (array) => {
        let currentIndex = array.length;
        let randomIndex;

        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }

        return array;
    };

    // Check login state.
    const checkLogin = () => {
        const modal = $('#login-modal'); 
        const game = $('#g, .logo');
        const nameSpan = $('.user-name');

        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                User = Object.assign({}, user);
                nameSpan.text(User.displayName || User.email);
                modal.modal('hide');
                game.show();
            } else {
                User = null;
                modal.modal('show');
                game.hide();
            }
        });


    };

    const setLoginForm = () => {
        $('.switch-login, .switch-register').click( (ev) => {
            const button = $(ev.target);
            if (button.hasClass('switch-register')) {
                $('.modal-body.login').slideUp();
                $('.modal-body.register').slideDown();
            } else {
                $('.modal-body.register').slideUp();
                $('.modal-body.login').slideDown();
            }
        });

        handleLogin();
        handleRegister();
        handleGoogleLogin();
        
        // Signout.
        $('.sign-out-btn').click( (ev) => {
            ev.preventDefault();
            firebase.auth().signOut();
        });
        
    };
    
    const handleLogin = () => {
        toggleLoginError('', true);

        const loginForm = $('.modal-body.login form');
        const email = loginForm.find('input[type=email]');
        const password = loginForm.find('input[type=password]');
        
        // Send auth request.
        loginForm.on('submit', (ev) => {
            ev.preventDefault();
            firebase
                .auth()
                .signInWithEmailAndPassword(email.val(), password.val())
                .catch(function(error) {
                    // Handle Errors here.
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    toggleLoginError(errorMessage);
                });
        });
    };

    const handleRegister = () => {
        toggleLoginError('', true);

        const registerForm = $('.modal-body.register form');
        const email = registerForm.find('input[type=email]');
        const password = registerForm.find('input[type=password]');
        
        // Send auth request.
        registerForm.on('submit', (ev) => {
            ev.preventDefault();
            firebase
                .auth()
                .createUserWithEmailAndPassword(email.val(), password.val())
                .catch(function(error) {
                    // Handle Errors here.
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    toggleLoginError(errorMessage);
                });
        });
    };

    const handleGoogleLogin = () => {
        toggleLoginError('', true);

        $('.google-signin-btn').click( () => {
            var provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
            firebase.auth().useDeviceLanguage();

            firebase.auth().signInWithPopup(provider).then(function(result) {
                // This gives you a Google Access Token. You can use it to access the Google API.
                var token = result.credential.accessToken;
                // The signed-in user info.
                User = Object.assign({}, result.user);
              }).catch(function(error) {
                // Handle Errors here.
                toggleLoginError(error.message);
              });
        });
    };

    const toggleLoginError = (errorMessage, hide) => {
        const alert = $('.modal-body.login .alert');
        if (hide) {
            return alert.hide();
        }
        
        alert.show()
            .text(errorMessage);
    };

    // Init game.
    (() => {
        startScreen('flip');

        settings = {
            "difficulties": {
                "casual": {
                    "time": 32,
                    "cards": 8
                },
                "medium": {
                    "time": 90,
                    "cards": 16
                },
                "hard": {
                    "time": 192,
                    "cards": 32
                }
            }
        };

        initCards();

        checkLogin();
        setLoginForm();

    })();
});