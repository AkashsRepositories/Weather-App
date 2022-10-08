const API_key = 'e0cf05bb3121e683735fffbd36087cec';

const giveIconUrl = (icon) =>  `http://openweathermap.org/img/wn/${icon}@2x.png`;

const DAYS  = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const displaySimilarCities =  (citiesJson) => {
    //access datalist element and add cities as options into that
    const dataList = document.querySelector('datalist#cities');

    const citiesArray = Array.from(citiesJson);
    let newInnerHtml = '';

    for(let city of citiesArray){
            newInnerHtml += `
            <option value="${city.name}, ${city.state} - ${city.country}" name ="${city}">
            `;
    }

    dataList.innerHTML = newInnerHtml;
}   

const similarCities = async (city) => {
    let limit = 5;

    const response  = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=${limit}&appid=${API_key}`)

    const citiesJson = await response.json();

    displaySimilarCities(await citiesJson);
}

function calculateDayWise(forecastList){
    
    // console.log(forecastList);
    
    let dayWiseMap = new Map();

    for(let forecast of forecastList){
        let {dt_txt} = forecast;
        let date = dt_txt.split(" ")[0];
        let dayNo = new Date(date).getDay();
        const day = DAYS[dayNo];
        
        let {weather:[{icon}], main: {temp_min, temp_max}} = forecast;
        if(dayWiseMap.has(day)){
            let prevArray = dayWiseMap.get(day);
            prevArray.push([icon, temp_min, temp_max]);
        } else {
             dayWiseMap.set(day, [[icon, temp_min, temp_max]]);
        }
    }

    // store only one icon, temp_min, temp_max with every key
    for(let [key, value] of dayWiseMap){
        
        const icon = value[0][0];

        let minTemp = 200, maxTemp = -1;

        for(let arr of value){
            minTemp = Math.min(minTemp, arr[1]);
            maxTemp = Math.max(maxTemp, arr[2]);
        }

        dayWiseMap.set(key, [icon, minTemp, maxTemp]);
    }

    return  dayWiseMap;
}

function load5DaysForecast({list: forecastList}){

    const  dayWise = calculateDayWise(forecastList);
    const fiveDaysContainer = document.querySelector('.five-days-forecast');

    let htmlContent = '';

    let index = 0;
    for(let [day, values] of dayWise){
         
        if(index < 5){
            let today = day;
            if(index === 0){
                //today
                today = 'today';
            } 

            htmlContent += `
            <section class="five-days-day">
                <h3 class="the-day">${today}</h3>
                <img class="weather-icon" src="${giveIconUrl(values[0])}" alt="weather-icon">
                <span class="min-temp">${formatTemp(values[1])}</span>
                <span class="max-temp">${formatTemp(values[2])}</span>
            </section>
            `
        }
        
        index++;
    }

    fiveDaysContainer.innerHTML = htmlContent;
}

function loadHourlyForecast({list}){
    const listOfFirst12 = list.slice(2, 14);

    const dateFormatter = Intl.DateTimeFormat("en",{
        hour12: true, hour: "numeric"
    });
    const hourlyContainer = document.querySelector('.hourly-forecast');
    let newInnerHTML = '';
    // hourlyContainer.innerHTML
    listOfFirst12.forEach(elem => {
        const {main:{temp}, weather:[{description, icon}], dt_txt} = elem;
        newInnerHTML += `<section class="hourly-forecast-item">
        <h3 class="hourly-time">${dateFormatter.format(new Date(dt_txt))}</h3>
        <img class="hourly-weather-icon" src="${giveIconUrl(icon)}" alt="${description}">
        <h3 class="hourly-temp">${formatTemp(temp)}</h3>
        </section>`;

        console.log('adding element in hourly-forecast-container')
    });

    hourlyContainer.innerHTML = newInnerHTML;
}

function loadFeelsLikeAndHumidity({main:{feels_like, humidity}}){
    const feelsLikeElem = document.querySelector('.feels-like > span');
    const humidityElem = document.querySelector('.humidity > span');

    feelsLikeElem.textContent = formatTemp(feels_like);
    humidityElem.textContent = `${humidity} %`;
}

function loadCurrentWeather(currentWeatherJSON){

    let {main:{temp, temp_min, temp_max}, weather: [{description}]} = currentWeatherJSON;
    const currentWeather = document.querySelector('.weather-now');
    const temperature = currentWeather.querySelector('.temperature');
    const desc = currentWeather.querySelector('.description');
    const high = currentWeather.querySelector('.high-temp-value');
    const low = currentWeather.querySelector('.low-temp-value');

    temperature.textContent = formatTemp(temp);
    desc.textContent = description.toUpperCase();
    high.textContent = formatTemp(temp_min);
    low.textContent = formatTemp(temp_max);

    //loading feels_like and Humidity
    loadFeelsLikeAndHumidity(currentWeatherJSON);

}

// 36 => 36° C
const formatTemp = (temp) => `${temp}° C`;

const loadDataForSpecifiedCity = async (city) => {
    document.querySelector('.city').textContent = city;

    const unitOfMeasurement = 'metric'; //metric is used for celsius
    
    //current Weather forecast
    const currentWeatherAsJSONString = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_key}&units=${unitOfMeasurement}`);
    const currentWeatherJSON = await currentWeatherAsJSONString.json();  

    loadCurrentWeather(await currentWeatherJSON);

    //hourly forecast
    const hourlyForecastJSONString = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_key}&units=${unitOfMeasurement}`)
    const hourlyForecastJSON = await hourlyForecastJSONString.json();

    loadHourlyForecast(await hourlyForecastJSON);
    load5DaysForecast(await hourlyForecastJSON);
}

const addEventListenersOnSearchBox = async ()  => {
    //fetching the search input box
    const searchBox = document.querySelector('#city-search');

    //when input is changed
    searchBox.addEventListener('input', async function(event){
        const inputCity = searchBox.value;
        console.log(inputCity);

        //only make a request to api when inputCity has some value (to avoid error)
        if(inputCity)
            similarCities(inputCity);
    });

    //when user searching for a city
    searchBox.addEventListener('change', async ()=>{
        const inputCity = searchBox.value;
        if(inputCity)
            loadDataForSpecifiedCity(inputCity);
    })
}

//get data once when DOM content has been loaded
document.addEventListener('DOMContentLoaded', async ()=>{
    
    const city = document.querySelector('.city').textContent;
    loadDataForSpecifiedCity(city);

    addEventListenersOnSearchBox();
});

