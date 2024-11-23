import type { Node, Edge, EdgeCallback } from './MrType';
import { reference_store } from '../../../Helper/Helper';
import type { ReferencePair } from './MrType';
import { make_better_set, set_add_item,  set_map, set_remove_item } from 'generic-handler/built_in_generics/generic_better_set';

import { to_string } from 'generic-handler/built_in_generics/generic_conversation';

export const get_reference = reference_store();

const node_store = new Map<number, Node<any>>();

export function set_node(node: Node<any>){
    if (node_store.has(node.id)){
        throw new Error("Node already exists");
    }
    else{
        node_store.set(node.id, node);
    }
}

export function remove_node(node: Node<any>){
    node_store.delete(node.id);
}

export function get_node(id: number): Node<any>{
    const v = node_store.get(id);
    if (v !== undefined){
        return v;
    }
    else{
        throw new Error("Node not found: " + id);
    }
}

export function construct_node<E>(value: E): Node<E>{
    const id: number = get_reference();
    var v: E = value;

    var children_edges = make_better_set<any>([])
    var parents_edges = make_better_set<any>([])
    return {
        id,
        v,
        get children_edges() {return children_edges},
        get parent_edges() {return parents_edges},
        add_child_edge: (edge: any) => {
            children_edges = set_add_item(children_edges, edge)
        },
        remove_child_edge: (edge: any) => {
            children_edges = set_remove_item(children_edges, edge)
        },
        add_parent_edge: (edge: any) => {
            parents_edges = set_add_item(parents_edges, edge)
        },
        remove_parent_edge: (edge: any) => {
            parents_edges = set_remove_item(parents_edges, edge)
        }
    }
}

export function get_children(n: any){
    return set_map(n.children_edges, (e: any) => {
        return e.child
    })
}

export function get_parents(n: any){
    return set_map(n.parent_edges, (e: any) => {
        return e.parent
    })
}

var edge_store = new Map<ReferencePair, Edge<any, any>>();

function store_reference_pair(edge: Edge<any, any>){
    edge_store.set([edge.parents_ids, edge.children_ids], edge)
}

export function fetch_edge<A, B>(source: Node<A>, target: Node<B>): Edge<A, B>{
    const v = edge_store.get([source.id, target.id])
    if (v !== undefined){
        return v
    }
    else{
        throw new Error("Edge not found: " + to_string(source) + " " + to_string(target))
    }
}

export function construct_edge<A, B>(source: Node<A>, target: Node<B>, f: EdgeCallback<A, B>): Edge<A, B>{
    var to_activate = () => f(notify, source.v)

    function activate(){
        to_activate()
    }

    function notify(v: any){
        target.v = v
    }

    const edge = {
        parents_ids: source.id,
        children_ids: target.id,
        activate
    }    

    source.add_child_edge(edge)
    target.add_parent_edge(edge)
    store_reference_pair(edge)

    return edge
}






