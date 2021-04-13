//sweepline voronoi diagram.
//import { Point } from "./point";

const canvas = <HTMLCanvasElement> document.querySelector('#Canvas');
const button = <HTMLButtonElement>document.querySelector('#button');

//Width and Height of Canvas
const width = canvas.width;
const height = canvas.height;

//Event Listeners for interaction
canvas.addEventListener("click", (e:MouseEvent) => newPoint(e.clientX , e.clientY));
button.addEventListener("click", (e:MouseEvent) => sweepLine());

//Animation variables
let clicked = false;
let line_position = 0;

//Fortune algorithm variables
var siteEvents = [];
var circleEvents = [];
var beachlineRoot = null;

var edges = [];
var halfedges = [];
var regions = [];
var vertices = [];


const ctx = canvas.getContext('2d');

ctx.fillStyle = 'rgb(153, 153, 153)';
ctx.strokeRect(0, 0, width, height);

var pointList = [];
var displayedCircleEvents = [];

//DEBUG FUNCTION
function printList()
{
    printChildren(beachlineRoot, 0)
}

function printChildren(node: TreeNode, layer: number)
{
    console.log("Children of", node.site, "at layer ", layer, ":")
    if(node.left)
        console.log("LEFT: ", node.left.site)
    if(node.right)
        console.log("RIGHT: ", node.right.site)

    console.log("====================================")

    if(node.left)
    {
        printChildren(node.left, layer+1)
    }
    if(node.right)
    {
        printChildren(node.right, layer+1)
    }
}

//ADDING A NEW POINT
function newPoint(x, y)
{
    if(clicked)
    {
        return;
    }
    x = x - canvas.offsetLeft;
    y = y - canvas.offsetTop;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, 360, false);
    ctx.fill();
    pointList.push(new Point(x,y));
}

function handleSite(site: Point)
{
    let index = findRegion(site);
    if(index == -1)
    {
        regions.push(new Region(site));
    }

    addToBeachline(site);
}

function addToBeachline(site: Point)
{
    let directrix = site.Y;
    let site_x = site.X;

    var currentNode = beachlineRoot;
    var lArc, rArc, dxl, dxr;

    //finding left and right sections of new arc.
    while (currentNode) 
    {
        dxl = leftBreakPoint(currentNode,directrix) - site_x ;
        // site_x  lessThanWithEpsilon xl => falls somewhere before the left edge of the beachsection
        if (dxl > 1e-9) 
        {
            // this case should never happen
            console.log("this shouldn't happen")
            currentNode = currentNode.left;
        }
        else 
        {
            dxr = site_x - rightBreakPoint(currentNode,directrix);
            // site_x  greaterThanWithEpsilon xr => falls somewhere after the right edge of the beachsection
            if (dxr > 1e-9) 
            {
                if (!currentNode.right) 
                {
                    lArc = currentNode;
                    break;
                }
                currentNode = currentNode.right;
            }
            else 
            {
                // site_x  equalWithEpsilon xl => falls exactly on the left edge of the beachsection
                if (dxl > -1e-9) 
                {
                    lArc = currentNode.previous;
                    rArc = currentNode;
                }
                // site_x  equalWithEpsilon xr => falls exactly on the right edge of the beachsection
                else if (dxr > -1e-9)
                {
                    lArc = currentNode;
                    rArc = currentNode.next;
                }
                // falls exactly somewhere in the middle of the beachsection
                else 
                {
                    lArc = rArc = currentNode;
                }
                break;
            }
        }
    }

    //With the left arc found now, insert the new arc into the tree.
    var newNode = new TreeNode(site);
    insertSuccessor(lArc, newNode);

    //first section
    if (!lArc && !rArc) 
    {
        return;
    }

    //splitting a previous arc
    if (lArc === rArc) 
    {
        // invalidate circle event of split beach section
        detachCircleEvent(lArc);

        // split the beach section into two separate beach sections
        rArc = new TreeNode(lArc.site);
        insertSuccessor(newNode, rArc);

        // since we have a new transition between two beach sections,
        // a new edge is born
        newNode.edge = rArc.edge = createEdge(lArc.site, newNode.site, null, null);

        // check whether the left and right beach sections are collapsing
        // and if so create circle events, to be notified when the point of
        // collapse is reached.
        attachCircleEvent(lArc);
        attachCircleEvent(rArc);
        return;
    }

    if (lArc && !rArc) 
    {
        newNode.edge = createEdge(lArc.site,newNode.site, null, null);
        return;
    }

    if (lArc !== rArc) 
    {
        // invalidate circle events of left and right sites
        detachCircleEvent(lArc);
        detachCircleEvent(rArc);

        // an existing transition disappears, meaning a vertex is defined at
        // the disappearance point.
        // since the disappearance is caused by the new beachsection, the
        // vertex is at the center of the circumscribed circle of the left,
        // new and right beachsections.
        var lSite = lArc.site,
            ax = lSite.X,
            ay = lSite.Y,
            bx=site.X-ax,
            by=site.X-ay,
            rSite = rArc.site,
            cx=rSite.X-ax,
            cy=rSite.Y-ay,
            d=2*(bx*cy-by*cx),
            hb=bx*bx+by*by,
            hc=cx*cx+cy*cy,
            vertex = new Point((cy*hb-by*hc)/d+ax, (bx*hc-cx*hb)/d+ay);

        // one transition disappear
        setEdgeStartpoint(rArc.edge, lSite, rSite, vertex);

        // two new transitions appear at the new vertex location
        newNode.edge = createEdge(lSite, site, null, vertex);
        rArc.edge = createEdge(site, rSite, null, vertex);

        // check whether the left and right beach sections are collapsing
        // and if so create circle events, to handle the point of collapse.
        attachCircleEvent(lArc);
        attachCircleEvent(rArc);
        return;
    }
}

// adapted from https://github.com/gorhill/Javascript-Voronoi
function leftBreakPoint(node, directrix) 
{
    
    var site = node.site,
        rfocx = site.X,
        rfocy = site.Y,
        pby2 = rfocy-directrix;
    // parabola in degenerate case where focus is on directrix
    if (!pby2)
    {
        return rfocx;
    }
    var lArc = node.previous;
    if (!lArc) 
    {
        return -Infinity;
    }
    site = lArc.site;
    var lfocx = site.X,
        lfocy = site.Y,
        plby2 = lfocy-directrix;
    // parabola in degenerate case where focus is on directrix
    if (!plby2) 
    {
        return lfocx;
    }
    var hl = lfocy-rfocy,
        aby2 = 1/pby2-1/plby2,
        b = hl/plby2;
    if (aby2) 
    {
        return (-b+Math.sqrt(b*b-2*aby2*(hl*hl/(-2*plby2)-lfocy+plby2/2+rfocy-pby2/2)))/aby2+rfocx;
    }
    // both parabolas have same distance to directrix, thus break point is midway
    return (rfocx+lfocx)/2;
};

// adapted from https://github.com/gorhill/Javascript-Voronoi
function rightBreakPoint(node, directrix) 
{
    var rArc = node.next;
    if (rArc) {
        return leftBreakPoint(rArc, directrix);
        }
    var site = node.site;
    return site.Y === directrix ? site.X : Infinity;
};

//TREE LOGIC

//ADAPTED FROM https://github.com/gorhill/Javascript-Voronoi
function removeNode(node: TreeNode)
{
    // >>> rhill 2011-05-27: Performance: cache previous/next nodes
    if (node.next) {
        node.next.previous = node.previous;
        }
    if (node.previous) {
        node.previous.next = node.next;
        }
    node.next = node.previous = null;
    // <<<
    var parent = node.parent,
        left = node.left,
        right = node.right,
        next;
    if (!left) {
        next = right;
        }
    else if (!right) {
        next = left;
        }
    else {
        next = getFirst(right);
        }
    if (parent) {
        if (parent.left === node) {
            parent.left = next;
            }
        else {
            parent.right = next;
            }
        }
    else {
        beachlineRoot = next;
        }
    // enforce red-black rules
    var isRed;
    if (left && right) {
        isRed = next.indicator;
        next.indicator = node.indicator;
        next.left = left;
        left.parent = next;
        if (next !== right) {
            parent = next.parent;
            next.parent = node.parent;
            node = next.right;
            parent.left = node;
            next.right = right;
            right.parent = next;
            }
        else {
            next.parent = parent;
            parent = next;
            node = next.right;
            }
        }
    else {
        isRed = node.indicator;
        node = next;
        }
    // 'node' is now the sole successor's child and 'parent' its
    // new parent (since the successor can have been moved)
    if (node) {
        node.parent = parent;
        }
    // the 'easy' cases
    if (isRed) {return;}
    if (node && node.indicator) {
        node.indicator = false;
        return;
        }
    // the other cases
    var sibling;
    do {
        if (node === beachlineRoot) {
            break;
            }
        if (node === parent.left) {
            sibling = parent.right;
            if (sibling.indicator) {
                sibling.indicator = false;
                parent.indicator = true;
                rotateLeft(parent);
                sibling = parent.right;
                }
            if ((sibling.left && sibling.left.indicator) || (sibling.right && sibling.right.indicator)) {
                if (!sibling.right || !sibling.right.indicator) {
                    sibling.left.indicator = false;
                    sibling.indicator = true;
                    rotateRight(sibling);
                    sibling = parent.right;
                    }
                sibling.indicator = parent.indicator;
                parent.indicator = sibling.right.indicator = false;
                rotateLeft(parent);
                node = beachlineRoot;
                break;
                }
            }
        else {
            sibling = parent.left;
            if (sibling.indicator) {
                sibling.indicator = false;
                parent.indicator = true;
                rotateRight(parent);
                sibling = parent.left;
                }
            if ((sibling.left && sibling.left.indicator) || (sibling.right && sibling.right.indicator)) {
                if (!sibling.left || !sibling.left.indicator) {
                    sibling.right.indicator = false;
                    sibling.indicator = true;
                    rotateLeft(sibling);
                    sibling = parent.left;
                    }
                sibling.indicator = parent.indicator;
                parent.indicator = sibling.left.indicator = false;
                rotateRight(parent);
                node = beachlineRoot;
                break;
                }
            }
        sibling.indicator = true;
        node = parent;
        parent = parent.parent;
    } while (!node.indicator);
    if (node) {node.indicator = false;}
}


function insertSuccessor(predecessor: TreeNode, successor: TreeNode)
{
    var parent;
    if (predecessor) {
        // >>> rhill 2011-05-27: Performance: cache previous/next nodes
        successor.previous = predecessor;
        successor.next = predecessor.next;
        if (predecessor.next) {
            predecessor.next.previous = successor;
            }
        predecessor.next = successor;
        // <<<
        if (predecessor.right) {
            // in-place expansion of predecessor.right.getFirst();
            predecessor = predecessor.right;
            while (predecessor.left) {predecessor = predecessor.left;}
            predecessor.left = successor;
            }
        else {
            predecessor.right = successor;
            }
        parent = predecessor;
        }
    // rhill 2011-06-07: if predecessor is null, successor must be inserted
    // to the left-most part of the tree
    else if (beachlineRoot) {
        predecessor = getFirst(beachlineRoot);
        // >>> Performance: cache previous/next nodes
        successor.previous = null;
        successor.next = predecessor;
        predecessor.previous = successor;
        // <<<
        predecessor.left = successor;
        parent = predecessor;
        }
    else {
        // >>> Performance: cache previous/next nodes
        successor.previous = successor.next = null;
        // <<<
        beachlineRoot = successor;
        parent = null;
        }
    successor.left = successor.right = null;
    successor.parent = parent;
    successor.indicator = true;
    // Fixup the modified tree by recoloring nodes and performing
    // rotations (2 at most) hence the red-black tree properties are
    // preserved.
    var grandpa, uncle;
    predecessor = successor;
    while (parent && parent.indicator) {
        grandpa = parent.parent;
        if (parent === grandpa.left) {
            uncle = grandpa.right;
            if (uncle && uncle.indicator) {
                parent.indicator = uncle.indicator = false;
                grandpa.indicator = true;
                predecessor = grandpa;
                }
            else {
                if (predecessor === parent.right) {
                    rotateLeft(parent);
                    predecessor = parent;
                    parent = predecessor.parent;
                    }
                parent.indicator = false;
                grandpa.indicator = true;
                rotateRight(grandpa);
                }
            }
        else {
            uncle = grandpa.left;
            if (uncle && uncle.indicator) {
                parent.indicator = uncle.indicator = false;
                grandpa.indicator = true;
                predecessor = grandpa;
                }
            else {
                if (predecessor === parent.left) {
                    rotateRight(parent);
                    predecessor = parent;
                    parent = predecessor.parent;
                    }
                parent.indicator = false;
                grandpa.indicator = true;
                rotateLeft(grandpa);
                }
            }
        parent = predecessor.parent;
        }
    beachlineRoot.indicator = false;
}

function rotateLeft(node: TreeNode) 
{
    var p = node,
        q = node.right, // can't be null
        parent = p.parent;
    if (parent) {
        if (parent.left === p) {
            parent.left = q;
            }
        else {
            parent.right = q;
            }
        }
    else {
        beachlineRoot = q;
        }
    q.parent = parent;
    p.parent = q;
    p.right = q.left;
    if (p.right) {
        p.right.parent = p;
        }
    q.left = p;
}

function rotateRight(node: TreeNode) 
{
    var p = node,
        q = node.left, // can't be null
        parent = p.parent;
    if (parent) {
        if (parent.left === p) {
            parent.left = q;
            }
        else {
            parent.right = q;
            }
        }
    else {
        beachlineRoot = q;
        }
    q.parent = parent;
    p.parent = q;
    p.left = q.right;
    if (p.left) {
        p.left.parent = p;
        }
    q.right = p;
}

function getFirst(node: TreeNode) 
{
    while (node.left) 
    {
        node = node.left;
    }
    return node;
}

function getLast(node: TreeNode) 
{
    while (node.right) 
    {
        node = node.right;
    }
    return node;
}


function detachCircleEvent(node: TreeNode)
{
    var cEvent = node.circleEventObject;
    if(cEvent)
    {
        let index = circleEvents.indexOf(cEvent, 0);
        if (index > -1) 
        {
            circleEvents.splice(index, 1);
        }
        index = displayedCircleEvents.indexOf(cEvent.location, 0)
        if(index > -1)
        {
            console.log("hi")
            displayedCircleEvents.splice(index,1);
        }
        node.circleEventObject = null;
    }
}

function attachCircleEvent(node: TreeNode)
{
    var lArc = node.previous;
    var rArc = node.next;
    if(!lArc || !rArc)
    {
        console.error("We're missing an arc");
        return;
    }
    var lSite = lArc.site;
    var cSite = node.site;
    var rSite = rArc.site;

    if (lSite===rSite) 
    {
        console.log("Left arc is Right arc.")
        return;
    }

    var bx = cSite.X;
    var by = cSite.Y;
    var ax = lSite.X-bx;
    var ay = lSite.Y-by;
    var cx = rSite.X-bx;
    var cy = rSite.Y-by;

    // http://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
    // rhill 2011-05-21: Nasty finite precision error which caused circumcircle() to
    // return infinites: 1e-12 seems to fix the problem.

    var d = 2*(ax*cy-ay*cx);
    if (d >= -2e-12)
    {
        console.log("d is off.")
        return;
    }

    var ha = ax*ax+ay*ay;
    var hc = cx*cx+cy*cy;
    var x = (cy*ha-ay*hc)/d;
    var y = (ax*hc-cx*ha)/d;
    var ycenter = y+by;

    var newCircleEvent = new CircleEvent(node,
                                      cSite,
                                      Math.floor(x+bx),
                                      Math.floor(ycenter+Math.sqrt(x*x+y*y)),
                                      ycenter);
    node.circleEventObject = newCircleEvent;

    //add event to queue
    if(circleEvents.length == 0)
    {
        circleEvents.push(newCircleEvent);
        displayedCircleEvents.push(newCircleEvent.location)
    }
    else
    {
        let length = circleEvents.length;
        for(var i = 0; i < length; i++)
        {
            if(circleEvents[i].location.X >= newCircleEvent.location.X)
            {
                circleEvents.splice(i, 0, newCircleEvent);
                displayedCircleEvents.push(newCircleEvent.location)
            }
        }
        if(circleEvents.length == length)
        {
            circleEvents.push(newCircleEvent);
            displayedCircleEvents.push(newCircleEvent.location)
        }
    }
    
}

function removeFromBeachline(event: CircleEvent)
{
    var x = event.location.X
    var y = event.yCenter

    var vertex = new Point(x, event.yCenter)

    var previous = event.node.previous
    var next = event.node.next

    var disappearingTransitions = [event.node];
    

    detachBeachsection(event.node);

    //left check
    var lArc = previous;
    while (lArc.circleEventObject && Math.abs(x-lArc.circleEventObject.location.X)<1e-9 && Math.abs(y-lArc.circleEventObject.yCenter)<1e-9) {
        previous = lArc.previous;
        disappearingTransitions.unshift(lArc);
        detachBeachsection(lArc);
        lArc = previous;
        }
    // even though it is not disappearing, I will also add the beach section
    // immediately to the left of the left-most collapsed beach section, for
    // convenience, since we need to refer to it later as this beach section
    // is the 'left' site of an edge for which a start point is set.
    disappearingTransitions.unshift(lArc);
    detachCircleEvent(lArc);

    // right check
    var rArc = next;
    while (rArc.circleEventObject && Math.abs(x-rArc.circleEventObject.location.X)<1e-9 && Math.abs(y-rArc.circleEventObject.yCenter)<1e-9) {
        next = rArc.next;
        disappearingTransitions.push(rArc);
        detachBeachsection(rArc); // mark for reuse
        rArc = next;
        }

        
    disappearingTransitions.push(rArc);
    detachCircleEvent(rArc);

    // walk through all the disappearing transitions between beach sections and
    // set the start point of their (implied) edge.
    var nArcs = disappearingTransitions.length;
    var iArc;
    for (iArc=1; iArc<nArcs; iArc++) {
        rArc = disappearingTransitions[iArc];
        lArc = disappearingTransitions[iArc-1];
        setEdgeStartpoint(rArc.edge, lArc.site, rArc.site, vertex);
        }

    
    lArc = disappearingTransitions[0];
    rArc = disappearingTransitions[nArcs-1];
    rArc.edge = createEdge(lArc.site, rArc.site, undefined, vertex);

    // create circle events if any for beach sections left in the beachline
    // adjacent to collapsed sections
    attachCircleEvent(lArc);
    attachCircleEvent(rArc);
}

function detachBeachsection(node: TreeNode)
{
    detachCircleEvent(node)

    removeNode(node)
}

function clipEdges()
{
    // connect all dangling edges to bounding box
    // or get rid of them if it can't be done
    var iEdge = edges.length;
    var edge;

    // iterate backward so we can splice safely
    while (iEdge--) {
        edge = edges[iEdge];
        // edge is removed if:
        //   it is wholly outside the bounding box
        //   it is looking more like a point than a line
        if (!connectEdge(edge) ||
            !clipEdge(edge) ||
            (Math.abs(edge.start.X - edge.end.X) < 1e-9 && Math.abs(edge.start.Y - edge.end.Y) < 1e-9)) {
            edge.start = edge.end = null;
            edges.splice(iEdge,1);
            }
        }
}

function clipEdge(edge: Edge)
{
    var ax = edge.start.X,
        ay = edge.start.Y,
        bx = edge.end.X,
        by = edge.end.Y,
        t0 = 0,
        t1 = 1,
        dx = bx-ax,
        dy = by-ay;
    // left
    var q = ax;
    if (dx===0 && q<0) {return false;}
    var r = -q/dx;
    if (dx<0) {
        if (r<t0) {return false;}
        if (r<t1) {t1=r;}
        }
    else if (dx>0) {
        if (r>t1) {return false;}
        if (r>t0) {t0=r;}
        }
    // right
    q = width - ax;
    if (dx===0 && q<0) {return false;}
    r = q/dx;
    if (dx<0) {
        if (r>t1) {return false;}
        if (r>t0) {t0=r;}
        }
    else if (dx>0) {
        if (r<t0) {return false;}
        if (r<t1) {t1=r;}
        }
    // top
    q = ay;
    if (dy===0 && q<0) {return false;}
    r = -q/dy;
    if (dy<0) {
        if (r<t0) {return false;}
        if (r<t1) {t1=r;}
        }
    else if (dy>0) {
        if (r>t1) {return false;}
        if (r>t0) {t0=r;}
        }
    // bottom        
    q = height - ay;
    if (dy===0 && q<0) {return false;}
    r = q/dy;
    if (dy<0) {
        if (r>t1) {return false;}
        if (r>t0) {t0=r;}
        }
    else if (dy>0) {
        if (r<t0) {return false;}
        if (r<t1) {t1=r;}
        }

    // if we reach this point, Voronoi edge is within bbox

    // if t0 > 0, va needs to change
    // rhill 2011-06-03: we need to create a new vertex rather
    // than modifying the existing one, since the existing
    // one is likely shared with at least another edge
    if (t0 > 0) {
        edge.start = createVertex(ax+t0*dx, ay+t0*dy);
        }

    // if t1 < 1, vb needs to change
    // rhill 2011-06-03: we need to create a new vertex rather
    // than modifying the existing one, since the existing
    // one is likely shared with at least another edge
    if (t1 < 1) {
        edge.end = createVertex(ax+t1*dx, ay+t1*dy);
        }

    // va and/or vb were clipped, thus we will need to close
    // regions which use this edge.
    if ( t0 > 0 || t1 < 1 ) {
        let index = findRegion(edge.left_site)
        regions[index].closeMe = true;
        index = findRegion(edge.right_site)
        regions[index].closeMe = true;
    }

    return true;
}

function connectEdge(edge: Edge)
{
    var vb = edge.end;
    if (!!vb) {return true;}

    // make local copy for performance purpose
    var start = edge.start,
        xl = 0,
        xr = width,
        yt = 0,
        yb = height,
        lSite = edge.left_site,
        rSite = edge.right_site,
        lx = lSite.X,
        ly = lSite.Y,
        rx = rSite.X,
        ry = rSite.Y,
        fx = (lx+rx)/2,
        fy = (ly+ry)/2,
        fm, fb;

    // if we reach here, this means regions which use this edge will need
    // to be closed, whether because the edge was removed, or because it
    // was connected to the bounding box.
    let index = findRegion(lSite);
    regions[index].closeMe = true;
    index = findRegion(rSite)
    regions[index].closeMe = true;

    // get the line equation of the bisector if line is not vertical
    if (ry !== ly) {
        fm = (lx-rx)/(ry-ly);
        fb = fy-fm*fx;
        }

    // remember, direction of line (relative to left site):
    // upward: left.X < right.X
    // downward: left.X > right.X
    // horizontal: left.X == right.X
    // upward: left.X < right.X
    // rightward: left.Y < right.Y
    // leftward: left.Y > right.Y
    // vertical: left.Y == right.Y

    // depending on the direction, find the best side of the
    // bounding box to use to determine a reasonable start point

    // rhill 2013-12-02:
    // While at it, since we have the values which define the line,
    // clip the end of start if it is outside the bbox.
    // https://github.com/gorhill/Javascript-Voronoi/issues/15
    // TODO: Do all the clipping here rather than rely on Liang-Barsky
    // which does not do well sometimes due to loss of arithmetic
    // precision. The code here doesn't degrade if one of the vertex is
    // at a huge distance.

    // special case: vertical line
    if (fm === undefined) {
        // doesn't intersect with viewport
        if (fx < xl || fx >= xr) {return false;}
        // downward
        if (lx > rx) {
            if (!start || start.Y < yt) {
                start = createVertex(fx, yt);
                }
            else if (start.Y >= yb) {
                return false;
                }
            vb = createVertex(fx, yb);
            }
        // upward
        else {
            if (!start || start.Y > yb) {
                start = createVertex(fx, yb);
                }
            else if (start.Y < yt) {
                return false;
                }
            vb = createVertex(fx, yt);
            }
        }
    // closer to vertical than horizontal, connect start point to the
    // top or bottom side of the bounding box
    else if (fm < -1 || fm > 1) {
        // downward
        if (lx > rx) {
            if (!start || start.Y < yt) {
                start = createVertex((yt-fb)/fm, yt);
                }
            else if (start.Y >= yb) {
                return false;
                }
            vb = createVertex((yb-fb)/fm, yb);
            }
        // upward
        else {
            if (!start || start.Y > yb) {
                start = createVertex((yb-fb)/fm, yb);
                }
            else if (start.Y < yt) {
                return false;
                }
            vb = createVertex((yt-fb)/fm, yt);
            }
        }
    // closer to horizontal than vertical, connect start point to the
    // left or right side of the bounding box
    else {
        // rightward
        if (ly < ry) {
            if (!start || start.X < xl) {
                start = createVertex(xl, fm*xl+fb);
                }
            else if (start.X >= xr) {
                return false;
                }
            vb = createVertex(xr, fm*xr+fb);
            }
        // leftward
        else {
            if (!start || start.X > xr) {
                start = createVertex(xr, fm*xr+fb);
                }
            else if (start.X < xl) {
                return false;
                }
            vb = createVertex(xl, fm*xl+fb);
            }
        }
    edge.start = start;
    edge.end = vb;

    return true;
}

function closeCells()
{
    var xl = 0,
        xr = width,
        yt = 0,
        yb = height,
        iRegion = regions.length,
        region,
        iLeft,
        halfedges, nHalfedges,
        edge,
        va, vb, vz,
        lastBorderSegment

    while (iRegion--) {
        region = regions[iRegion];
        // prune, order halfedges counterclockwise, then add missing ones
        // required to close regions
        if (!region.prepareHalfedges()) {
            continue;
            }
        if (!region.closeMe) {
            continue;
            }
        // find first 'unclosed' point.
        // an 'unclosed' point will be the end point of a halfedge which
        // does not match the start point of the following halfedge
        halfedges = region.halfedges;
        nHalfedges = halfedges.length;
        // special case: only one site, in which case, the viewport is the region
        // ...

        // all other cases
        iLeft = 0;
        while (iLeft < nHalfedges) {
            va = halfedges[iLeft].getEndpoint();
            vz = halfedges[(iLeft+1) % nHalfedges].getStartpoint();
            // if end point is not equal to start point, we need to add the missing
            // halfedge(s) up to vz
            if (Math.abs(va.X-vz.X)>=1e-9 || Math.abs(va.Y-vz.Y)>=1e-9) {

                // rhill 2013-12-02:
                // "Holes" in the halfedges are not necessarily always adjacent.
                // https://github.com/gorhill/Javascript-Voronoi/issues/16

                // find entry point:
                switch (true) {

                    // walk downward along left side
                    case equalWithEpsilon(va.X,xl) && lessThanWithEpsilon(va.Y,yb):
                        lastBorderSegment = equalWithEpsilon(vz.X,xl);
                        vb = createVertex(xl, lastBorderSegment ? vz.Y : yb);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                    // walk rightward along bottom side
                    case equalWithEpsilon(va.Y,yb) && lessThanWithEpsilon(va.X,xr):
                        lastBorderSegment = equalWithEpsilon(vz.Y,yb);
                        vb = createVertex(lastBorderSegment ? vz.X : xr, yb);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                    // walk upward along right side
                    case equalWithEpsilon(va.X,xr) && greaterThanWithEpsilon(va.Y,yt):
                        lastBorderSegment = equalWithEpsilon(vz.X,xr);
                        vb = createVertex(xr, lastBorderSegment ? vz.Y : yt);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                    // walk leftward along top side
                    case equalWithEpsilon(va.Y,yt) && greaterThanWithEpsilon(va.X,xl):
                        lastBorderSegment = equalWithEpsilon(vz.Y,yt);
                        vb = createVertex(lastBorderSegment ? vz.X : xl, yt);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                        // walk downward along left side
                        lastBorderSegment = equalWithEpsilon(vz.X,xl);
                        vb = createVertex(xl, lastBorderSegment ? vz.Y : yb);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                        // walk rightward along bottom side
                        lastBorderSegment = equalWithEpsilon(vz.Y,yb);
                        vb = createVertex(lastBorderSegment ? vz.X : xr, yb);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        va = vb;
                        // fall through

                        // walk upward along right side
                        lastBorderSegment = equalWithEpsilon(vz.X,xr);
                        vb = createVertex(xr, lastBorderSegment ? vz.Y : yt);
                        edge = createBorderEdge(region.site, va, vb);
                        iLeft++;
                        halfedges.splice(iLeft, 0, createHalfEdge(edge, region.site, null));
                        nHalfedges++;
                        if ( lastBorderSegment ) { break; }
                        // fall through

                    default:
                        throw "Voronoi.closeCells() > this makes no sense!";
                    }
                }
            iLeft++;
            }
        region.closeMe = false;
        }
}

function equalWithEpsilon(a,b){return Math.abs(a-b)<1e-9;};

function greaterThanWithEpsilon(a,b){return a-b>1e-9;};

function lessThanWithEpsilon(a,b){return b-a>1e-9;};

function loop()
{
    setTimeout(function() 
    {
        if (line_position <= height
            || siteEvents.length > 0
            || circleEvents.length > 0) 
        {
          checkEvents();
          renderCanvas(true);
          loop();
        }
        else
        {
            console.log("WE'RE DONE.")
            clipEdges();
            closeCells();
            renderCanvas(false);
        }
    }, 10)
}

function checkEvents()
{
    //SITE EVENT
    if(siteEvents.length != 0 
        && line_position >= siteEvents[siteEvents.length -1].Y)
    {
        let site_to_handle = siteEvents.pop();
        handleSite(site_to_handle);
        
        //DEBUG
        //printList()
        //console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        //Check if theres another at this position.
        if(siteEvents.length != 0 
            && line_position >= siteEvents[siteEvents.length -1].Y)
        {
            checkEvents();
        }
    }
    
    // console.log("vvvvvvvvvvvvvvvvvvv")
    // console.log(siteEvents.length)
    // console.log(circleEvents.length)
    // console.log(line_position)
    // console.log(height)
    // console.log("###################")

    //CIRCLE EVENT
    if(circleEvents.length != 0 
            && line_position >= circleEvents[circleEvents.length -1].location.Y)
    {
        let cE = circleEvents.pop();
        //console.log("we here.")
        removeFromBeachline(cE);

        //Check if theres another at this position.
        if(circleEvents.length != 0 
            && line_position >= circleEvents[circleEvents.length -1].location.Y)
        {
            checkEvents();
        }
    }
}

//RENDERING

function renderCanvas(parabolas: boolean)
{
    //CLEAR
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    //REDRAW BOX
    ctx.strokeStyle = 'rgb(153, 153, 153)';
    ctx.strokeRect(0, 0, width, height);
    //DRAW POINTS
    drawPoints();
    //DRAW LINE
    ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.moveTo(0, line_position);
    ctx.lineTo(canvas.width, line_position);
    ctx.stroke();
    //DRAW PARABOLAS
    if(parabolas)
    {
        drawParabolas(line_position);
    }
    //DRAW EDGES
    drawEdges();
    line_position += 1;
}


//Mainly from:
//https://jtauber.com/blog/2008/11/29/voronoi_canvas_tutorial_part_iii/
function drawParabola(f: Point, d_Y: number)
{
    let alpha = Math.sqrt((d_Y*d_Y)-(f.Y*f.Y));
    let p0x = f.X - alpha;
    let p0y = 0;
    let cp_x = f.X;
    let cp_y = f.Y + d_Y;
    let p1x = f.X + alpha;
    let p1y = 0;

    ctx.strokeStyle = "rgb(100, 100, 100)";
    //ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.quadraticCurveTo(cp_x, cp_y, p1x, p1y);
    ctx.stroke();
    //ctx.fill();
}

function drawEdges()
{
    //console.log(edges)
    edges.forEach(edge => {
        if(edge.start && edge.end)
        {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.moveTo(edge.start.X, edge.start.Y)
            ctx.lineTo(edge.end.X, edge.end.Y);
            ctx.stroke();
        }
    });
}

function drawParabolas(lineY: number)
{
    if(beachlineRoot == null)
    {
        return;
    }

    let currentParabola = getFirst(beachlineRoot);
    drawParabola(currentParabola.site, lineY);
    while(currentParabola.next != null)
    {
        drawParabola(currentParabola.next.site, lineY);
        currentParabola = currentParabola.next;
    }
}

function drawPoints()
{
    pointList.forEach(point => {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        ctx.arc(point.X, point.Y, 3.5, 0, 360, false);
        ctx.fill();
    });

    displayedCircleEvents.forEach(point => {
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.beginPath();
        ctx.arc(point.X, point.Y, 3.5, 0, 360, false);
        ctx.fill();
    });
}


//DATASTRUCTURE HANDLERS
function createEdge(lSite: Point, rSite: Point, start: Point, end: Point)
{
    var edge = new Edge(lSite, rSite, start, end);

    edges.push(edge)

    if(start)
    {
        setEdgeStartpoint(edge, lSite, rSite, start);
    }
    if(end)
    {
        setEdgeEndpoint(edge, lSite, rSite, end);
    }

    let index = findRegion(lSite);
    if(index == -1)
    {
        regions.push(new Region(lSite))
        regions[regions.length - 1].halfedges.push(createHalfEdge(edge, lSite, rSite));
    }
    else
    {
        regions[index].halfedges.push(createHalfEdge(edge, lSite, rSite));
    }

    index = findRegion(rSite);
    if(index == -1)
    {
        regions.push(new Region(rSite))
        regions[regions.length - 1].halfedges.push(createHalfEdge(edge, rSite, lSite));
    }
    else
    {
        regions[index].halfedges.push(createHalfEdge(edge, rSite, lSite));
    }

    return edge;
}

function setEdgeStartpoint(edge: Edge, lSite: Point, rSite: Point, vertex: Point)
{
    if (!edge.start && !edge.end) {
        edge.start = vertex;
        edge.left_site = lSite;
        edge.right_site = rSite;
        }
    else if (edge.left_site === rSite) {
        edge.end = vertex;
        }
    else {
        edge.start = vertex;
        }
}

function setEdgeEndpoint(edge: Edge, lSite: Point, rSite: Point, vertex: Point)
{
    if (!edge.start && !edge.end) {
        edge.start = vertex;
        edge.left_site = lSite;
        edge.right_site = rSite;
        }
    else if (edge.left_site === rSite) {
        edge.end = vertex;
        }
    else {
        edge.start = vertex;
        }
}

function findRegion(site: Point)
{
    let return_value = -1
    regions.forEach((region, index) => {
        if(region.site.X == site.X && 
            region.site.Y == site.Y)
        {
            return_value = index;
            return;
        }
    });
    return return_value;
}

function createHalfEdge(edge: Edge, lsite: Point, rsite: Point)
{
    var newHalfEdge = new HalfEdge(lsite, rsite, edge);

    if (rsite) 
    {
        newHalfEdge.angle = Math.atan2(rsite.Y - lsite.Y, rsite.X - lsite.X);
    }
    else
    {
        var va = edge.start,
            vb = edge.end;
        // rhill 2011-05-31: used to call getStartpoint()/getEndpoint(),
        // but for performance purpose, these are expanded in place here.
        newHalfEdge.angle = edge.left_site === lsite ?
            Math.atan2(vb.X-va.X, va.Y-vb.Y) :
            Math.atan2(va.X-vb.X, vb.Y-va.Y);
    }
}

function createBorderEdge(lsite: Point, start: Point, end: Point)
{
    var edge = new Edge(lsite, null, start, end)
    edges.push(edge)
    return edge;
}

function createVertex(x: number, y: number)
{
    var newV = new Point(x,y)
    vertices.push(newV)
    return newV
}

//DATASTRUCTURES
class Point
{
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}

class Edge
{
    public left_site: Point;
    public right_site: Point;

    public start: Point;
    public end: Point;

    constructor(ls: Point, rs: Point, s: Point, e: Point) {
        this.left_site = ls;
        this.right_site = rs;
        this.start = s;
        this.end = e;
    }
}

class HalfEdge
{
    public site: Point;
    public right_site: Point;
    public angle: number;
    public edge: Edge;

    constructor(ls: Point, rs: Point, e: Edge) {
        this.site = ls;
        this.right_site = rs;
        this.edge = e;
    }
}

class Region
{
    public site: Point;
    public halfedges: [];
    public closeMe: boolean = false;

    constructor(s: Point) {
        this.site = s;
        this.halfedges = [];
    }
}

class CircleEvent
{
    public node: TreeNode;
    public centerSite: Point;
    public location: Point;
    public yCenter: number;

    constructor(arc: TreeNode, site: Point, x: number, y: number, yC: number)
    {
        this.node = arc;
        this.centerSite = site;
        this.location = new Point(x, y);
        this.yCenter = yC;
    }
}

//Used to build Red/Black Tree
class TreeNode
{
    public site: Point;
    public left: TreeNode;
    public right: TreeNode;
    public previous: TreeNode;
    public next: TreeNode;
    public parent: TreeNode;
    public indicator: boolean;
    public edge: Edge;
    public circleEventObject: CircleEvent;

    constructor(s: Point)
    {
        this.site = s;
    }
}

//MAIN ENTRY POINT FOR ALGORITHM
function sweepLine()
{
    //CHECKS
    if(!clicked)
    {
        button.disabled = true;
        clicked = true;

        //ALGORITHM INIT
        siteEvents = pointList.slice(0);
        siteEvents.sort(function(a,b){
            var diff = b.Y - a.Y;
            if (diff) {return diff;}
            return b.X - a.X;
        });
    }
    //Don't start before we have points.
    if(pointList.length == 0)
    {
        clicked = false;
        button.disabled = false;
        return;
    }

    //ALGORITHM
    loop()
}