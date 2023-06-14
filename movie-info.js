import request from 'request';
import 'dotenv/config';
import { getTitleFromRequest } from './utils.js';

export async function getMovieInfoByTitle(data) {
    return new Promise((resolve, reject) => {
        const title = getTitleFromRequest(data);

        if (title === '') {
            console.log('Movie title is blank.')
            resolve();
        }
        const options = {
            url: `http://www.omdbapi.com/?t=${title}&apikey=${process.env.OMDB_KEY}`,
            json: true,
            headers: {
                'Content-type': 'application/json'
            }
        };

        request.get(options, (error, response, movie) => {
            if (error) {
                console.log(`Failed to get movie information. Error: ${JSON.stringify(error, null, 2)}` );
                resolve();
            }

            const formattedResponse = `
            > **Title**: ${movie.Title}
            > **Year:** ${movie.Year}
            > **Rated:** ${movie.Rated}
            > **Length:** ${movie.Runtime}
            > **Director:** ${movie.Director}
            > **Actors:** ${movie.Actors}
            > **Plot:** ${movie.Plot}
            > **More info:** https://www.imdb.com/title/${movie.imdbID}/`;

            resolve(formattedResponse);
        });
    });
}