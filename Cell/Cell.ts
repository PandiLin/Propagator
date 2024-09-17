import {  set_global_state,  get_global_parent, is_equal } from "../PublicState";
import { Propagator } from "../Propagator";
import { BehaviorSubject,  combineLatest,  pipe } from "rxjs";
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";

import { filter, map } from "rxjs/operators";
import { Relation, make_relation } from "../DataTypes/Relation";
import { inspect } from "bun";
import { is_nothing, the_nothing, is_contradiction, the_contradiction } from "./CellValue";
import { merge } from "./Merge"
import { PublicStateCommand } from "../PublicState";
import { describe } from "../ui";
import { is_layered_object } from "../temp_predicates";
export const cell_merge = merge;

export const strongest_value = construct_simple_generic_procedure("strongest_value", 1, (a: any[]) => {
    return a;
})

export const general_contradiction = construct_simple_generic_procedure("general_contradiction", 1, (a: any) => {
  return false;
})

export const handle_contradiction = construct_simple_generic_procedure("handle_contradiction", 1, (a: any) => {
  return null;
})

export const compactMap = <T, R>(fn: (value: T) => R) => pipe(
  map(fn),
  filter(value => value !== null && value !== undefined)
);

export class Cell{
  private relation : Relation 
  private neighbors : Map<string, Propagator> = new Map();
  private content : BehaviorSubject<any> = new BehaviorSubject<any>(the_nothing);
  private strongest : BehaviorSubject<any> = new BehaviorSubject<any>(the_nothing);

  constructor(name: string){
    this.relation = make_relation(name, get_global_parent());

    this.content
        .pipe(
          compactMap(content => this.testContent(content, this.strongest.getValue()))
        )
        .subscribe(content => {
          this.strongest.next(content);
        });
    set_global_state(PublicStateCommand.ADD_CELL, this);
    set_global_state(PublicStateCommand.ADD_CHILD, this.relation);
  }

  observe_update(observer:(cellValues: any) => void){
    combineLatest([this.content, this.strongest]).subscribe(observer);
  }

  getRelation(){
    return this.relation;
  }

  getContent(){
    return this.content;
  } 

  getStrongest(){
    return this.strongest;
  } 

  getNeighbors(){
    return this.neighbors;
  }

  addContent(increment:any){
 
    this.content.next(cell_merge(this.content.getValue(), increment));
  }

  testContent(content: any, strongest: any): any | null {

    const _strongest = strongest_value(content);
    console.log("testContent", describe(content), is_layered_object(strongest), describe(_strongest));
    if (is_equal(content, strongest)){
      console.log("returning null");
      return null;
    }
    else if (general_contradiction(_strongest)){
      handle_contradiction(this);
      return _strongest;
    }
    else {
      console.log("returning _strongest");
      return _strongest
    }
  }

  force_update(){
    this.content.next(this.content.getValue());
  }

  addNeighbor(propagator: Propagator){
    this.neighbors.set(propagator.getRelation().get_id(), propagator);
  }

  summarize(){
    const name = this.relation.get_name();
    const strongest = this.strongest.getValue();
    const content = this.content.getValue();
    return `name: ${name}\nstrongest: ${describe(strongest)}\ncontent: ${describe(content)}`;
  }
}



export function test_cell_content(cell: Cell){
  return cell.force_update();
}

export function add_cell_neighbour(cell: Cell, propagator: Propagator){
  cell.addNeighbor(propagator);
}

export function add_cell_content(cell: Cell, content: any){
  cell.addContent(content);
}

export function cell_strongest(cell: Cell){
  return cell.getStrongest();
}

export function cell_id(cell: Cell){
  if (cell === undefined){
    return "undefined";
  }

  return cell.getRelation().get_id();
}
