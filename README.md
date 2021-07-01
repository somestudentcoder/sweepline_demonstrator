# Voronoi Diagram Sweep Line (Fortune's Algorithm)

## Description & Usage ##

This is a simple demonstrator that shows how[Fortune's Algorithm]
(https://link.springer.com/article/10.1007%2FBF01840357) works in practice.
It is possible to place points on a plane and then watch the algorithm build
the diagram step by step. The execution can be paused at any point in time to
analyze the procedure. Also 4 predefined datasets are included with which the
algorithm can be viewed.

The demonstrator requires no external dependencies and also no http server
to be executed. Any modern browser can be used to run the html file.

To use the demonstrator, simply build the source code (see below) and open
the index.html in a browser of your choosing (needs to support html5 canvas).

## Build ##

Commands should be run under a **bash** shell.

The following command builds the project and places the JavaScript source code in the /dist folder.

	$> npm run build

The following command builds and watches the typscript code for changes to recompile.

	$> npm run development

## Credits ##

The algorithm implementation in this demonstrator is largely based on Raymond
Hill's JavaScript source code -
https://github.com/gorhill/Javascript-Voronoi. It was adapted to be used with
this demonstrator and saved a lot of work. Many thanks to Raymond Hill.

## Licence ##

MIT
