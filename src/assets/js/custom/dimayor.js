import $ from 'jquery';
import Vue from 'vue/dist/vue.min';

var SERVICES = 'https://s3-us-west-2.amazonaws.com/dimayor-opta-feeds/';
//var SERVICES = 'https://jupiter.binit.co/opta/';

var Dimayor = (function(my){
  "use strict";

  my.start = function(){
    $(function(){
      my.VM.start();
      my.Opta.start();
      configTabs();
    });
  };
  
  function configTabs(){
    $('.tabs').on('click', 'a', function(e){
      var t = $(this.getAttribute('href'));
      setTimeout(function(){
        Dimayor.Opta.startWidget(t);
      });
    });
  }
  
  return my;

})(Dimayor||{});

Dimayor.VM = (function(){
  "use strict";
  var my = {}, _vmRound = {}, _round={}, _competition;

  my.start = function(){
    createComponents();
    createVM();

    my.loadRound(function(){
      setTimeout(function(){
        new Foundation.Accordion($('#round-accordion'));
      }, 1000);
    });

    my.loadCompetition(function(){
      $('#round .fecha').html(_competition);
    });
    
    setInterval(my.loadRound, 30000);
  };
  
	my.loadRound = function(fn){
    var comp = Util.param('competition'),
			season = Util.param('season'),
			round = Util.param('round');

//    Util.getFeed('summary/' + comp + '/' + season + '/all.json', function(j){
    Util.getFeed('schedules/' + comp + '/' + season + '/rounds/' + round + '.json', function(j){
      try{
        _vmRound.$data.round = getMatches(j.matches);
//        _competition = j.competition.name;
        fn&&fn();
      } catch (e){
        console.log(e);
      }
		});
	};
  
	my.loadCompetition = function(fn){
    var comp = Util.param('competition'),
			season = Util.param('season');

    Util.getFeed('summary/' + comp + '/' + season + '/all.json', function(j){
      try{
        _competition = j.competition.name + ' - ' + season;
        fn&&fn();
      } catch (e){
        console.log(e);
      }
		});
	};
  
  //Private
  function createVM(){

    window._vmRound = _vmRound = new Vue({
			el: '#round',
			data: {
				round: {},
			}
		});

  }
  
  function createComponents(){

    var data = { 
      comp: Util.param('competition'),
      season: Util.param('season'),
      round: Util.param('round')
    };

    Vue.component('menu-match', {
			props: ['match'],
      data : function(){
        return data;
      },
			template: '\
<a class="row gamecast-nav" :href="\'?&competition=\'+comp+\'&season=\'+season+\'&round=\'+round+\'&match=\'+match.id">\
	<div class="small-5 text-right"><img :src="\'http://omo.akamai.opta.net/image.php?h=omo.akamai.opta.net&sport=football&entity=team&description=badges&dimensions=20&id=\' + match.home.id" alt="" class="escudo"></div>\
	<div class="small-2 text-center marcador">{{ match.home.score }} - {{ match.away.score }}</div>\
	<div class="small-5 text-left"><img :src="\'http://omo.akamai.opta.net/image.php?h=omo.akamai.opta.net&sport=football&entity=team&description=badges&dimensions=20&id=\' + match.away.id" alt="" class="escudo"></div>\
</a>'
		});

		Vue.component('menu-round', {
			props: ['date'],
			template: '\
<li class="accordion-item" :class="date.id ? \'\' : \'is-active\'" data-accordion-item>\
	<a href="#" class="accordion-title">{{date.date}}</a>\
	<div class="accordion-content" data-tab-content><menu-match v-for="item in date.matches" :match="item" :key="item.id"></menu-match></div></li>'
		});

	}
  
  function getMatches(j){
    var matches = {}, date, dates = [];

    $.each(j, function(){
      date = this.date.split(' ')[0];
      if(!matches[date]){
        matches[date] = [];
        dates.push(date);
      }
      matches[date].push(this);
    });

    dates.sort(function(a, b){
      if(a<b){
        return -1;
      }
      else{
        return 1;
      }
    });

    var round = [];
    dates.forEach(function(v,i){
      round.push({
        id: i,
        date: Util.dateFormat(new Date(v + 'T00:00:00-05:00')),
        matches: matches[v]
      });
    });
    
    return round;
  }

  return my;

})();


Dimayor.Opta = (function(){
  "use strict";
  
  var my = {};
  
  my.start = function(){
    configWidgets();

    my.startWidget($('#opta-w-timeline'));
    my.startWidget($('#juego'));
  };

  //Private
  function configWidgets(){
    var comp = Util.param('competition'),
        season = Util.param('season'),
        match = Util.param('match');

    $('opta-widget').each(function(){
      this.setAttribute('competition', comp);
      this.setAttribute('match', match);
      this.setAttribute('season', season);
      this.setAttribute('breakpoints', '400, 767, 991, 1170');
    });

  };

  my.startWidget = function($parent){
    if($parent.data('children')){
      var ref = '[parent="' + $parent.data('children') + '"]';
    } else {
      ref = '';
    }
    
    $parent.find('opta-widget' + ref).each(function(){
      this.removeAttribute('load');
    });

    Opta.start();
  }

  return my;

})(Dimayor||{});


var Util = (function(){
  "use strict";

  var my = {}, urlParams = {},
  dateFormats = {
    "AMPMS": [
      "a. m.",
      "p. m."
    ],
    "DAY": [
      "domingo",
      "lunes",
      "martes",
      "mi\u00e9rcoles",
      "jueves",
      "viernes",
      "s\u00e1bado"
    ],
    "ERANAMES": [
      "antes de Cristo",
      "despu\u00e9s de Cristo"
    ],
    "ERAS": [
      "a. C.",
      "d. C."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ],
    "SHORTDAY": [
      "dom.",
      "lun.",
      "mar.",
      "mi\u00e9.",
      "jue.",
      "vie.",
      "s\u00e1b."
    ],
    "SHORTMONTH": [
      "ene.",
      "feb.",
      "mar.",
      "abr.",
      "may.",
      "jun.",
      "jul.",
      "ago.",
      "sept.",
      "oct.",
      "nov.",
      "dic."
    ],
    "STANDALONEMONTH": [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d 'de' MMMM 'de' y",
    "longDate": "d 'de' MMMM 'de' y",
    "medium": "d MMM y H:mm:ss",
    "mediumDate": "d MMM y",
    "mediumTime": "H:mm:ss",
    "short": "d/M/yy H:mm",
    "shortDate": "d/M/yy",
    "shortTime": "H:mm"
  };

  my.param = function(name, def){
    return urlParams[name] || (def||'');
  }

  my.getFeed = function(feed, fn){
    $.ajax({
      url: SERVICES + feed,
      dataType: 'json',
      cache: false,
    }).done(function(j){
      fn(j);
    });
  }
  
  my.dateFormat = function(date){
    return dateFormats["DAY"][date.getDay()] + ' ' +
      date.getDate() + ' de ' +
      dateFormats["MONTH"][date.getMonth()];
  }
  
  // Private
  function loadParameters(){
    var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
  }

  loadParameters();

  return my;
}());


window.opta_settings = {
  subscription_id: 'e6804b56ef36694d562814192de3e53b',
  language:      'es_CO',
  timezone: 'America/Bogota'
};


module.exports = Dimayor;

window.dimayor = Dimayor;