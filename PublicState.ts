
import { Cell } from './Cell/Cell';
import {  make_relation, Relation } from './DataTypes/Relation';
import { Propagator } from './Propagator';
import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';

import { all_match, match_args } from 'generic-handler/Predicates';
import {  guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { is_layered_object } from './temp_predicates';
import { construct_readonly_reactor, construct_stateful_reactor, type StatefulReactor } from './Reactivity/Reactor';
import { pipe } from 'fp-ts/function';
import { filter, tap, map } from './Reactivity/Reactor';
import { generic_merge, set_merge } from './Cell/Merge';

export enum PublicStateCommand{
    ADD_CELL = "add_cell",
    ADD_PROPAGATOR = "add_propagator",
    ADD_CHILD = "add_child",
    SET_PARENT = "set_parent",
    ADD_AMB_PROPAGATOR = "add_amb_propagator",
    CLEAN_UP = "clean_up",
    FORCE_UPDATE_ALL = "force_update_all",
    SET_CELL_MERGE = "set_cell_merge"
}

export interface PublicStateMessage{
    command: PublicStateCommand;
    args: any[];
    summarize: () => string;
}

export function public_state_message(command: PublicStateCommand, ...args: any[]): PublicStateMessage{
    function get_command(){
        return command;
    }

    function get_args(){
        return args;
    } 

    function summarize(){
        const args_summarize = ( args[0] instanceof Cell) || (args[0] instanceof Propagator) ? args[0].summarize() : "unknown args";

        return  "command: " + get_command() + " args: " + args_summarize;
    }

    return {
        command: get_command(),
        args: get_args(),
        summarize: summarize
    }
}


var parent: StatefulReactor<Relation> = construct_stateful_reactor<Relation>(make_relation("root", null));
// Todo: make this read only
const all_cells: StatefulReactor<Cell[]> = construct_stateful_reactor<Cell[]>([]);
const all_propagators: StatefulReactor<Propagator[]> = construct_stateful_reactor<Propagator[]>([]);
const all_amb_propagators: StatefulReactor<Propagator[]> = construct_stateful_reactor<Propagator[]>([]);


const receiver : StatefulReactor<PublicStateMessage> = construct_stateful_reactor<PublicStateMessage>(public_state_message(PublicStateCommand.ADD_CELL, []));


function is_cell(o: any): boolean{
    return o.getContent !== undefined && o.getRelation !== undefined && o.getStrongest !== undefined && o.getNeighbors !== undefined;
}

function is_propagator(o: any): boolean{
    return o.getInputsID !== undefined && o.getOutputsID !== undefined && o.summarize !== undefined;
}


receiver.subscribe((msg: PublicStateMessage) => {
    switch(msg.command){
        case PublicStateCommand.FORCE_UPDATE_ALL:
            all_cells.get_value().forEach((cell: Cell) => {
                cell.force_update();
            });
            break;

        case PublicStateCommand.ADD_CELL:
            if (msg.args.every(o => is_cell(o))) {
                all_cells.next([...all_cells.get_value(), ...msg.args]);
            }
            else{
                console.log("captured attempt for insert weird thing inside cells:" + msg.args)
            }
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_propagators.next([...all_propagators.get_value(), ...msg.args]);
            }
            else{
                console.log("captured attempt for insert weird thing inside propagators")
            }
            
            break;

        case PublicStateCommand.ADD_CHILD:
            if (msg.args.length == 1){
                msg.args[0].add_child(msg.args[0]);
            }
            else if (msg.args.length == 2){ 
                const child = msg.args[0];
                const parent = msg.args[1];
                parent.next(parent.get_value().add_child(child));
            }
            else{
                throw_error(
                    "add_error:",
                    "add_child expects 1 or 2 arguments, got " + msg.args.length,
                    msg.summarize()
                );
            }
            break;
        case PublicStateCommand.SET_PARENT:
            guard(msg.args.length == 1, throw_error(
                "add_error:",
                "set_parent expects 1 argument, got " + msg.args.length,
                msg.summarize()
            ));
            parent = msg.args[0];
            break;
       
        case PublicStateCommand.ADD_AMB_PROPAGATOR:
            if (msg.args.every(o => o instanceof Propagator)) {
                all_amb_propagators.next([...all_amb_propagators.get_value(), ...msg.args]);
            }
            else{
                console.log("captured attempt for insert weird thing inside propagators")
            }
            break;

        case PublicStateCommand.CLEAN_UP:
            all_cells.next([])
            all_propagators.next([])
            all_amb_propagators.next([])
            set_global_state(PublicStateCommand.SET_CELL_MERGE, generic_merge)
            break;

        case PublicStateCommand.SET_CELL_MERGE:
            if (msg.args.length == 1){
                set_merge(msg.args[0]);
            }
            else{
                throw_error(
                    "add_error:",
                    "set_cell_merge expects 1 argument, got " + msg.args.length,
                    msg.summarize()
                );
            }
            break;
    }
})


observe_premises_has_changed().subscribe((has_changed: boolean) => {
    set_global_state(PublicStateCommand.FORCE_UPDATE_ALL, null);
})


export function set_global_state(type: PublicStateCommand, ...args: any[]){
    // altering global state should be very careful, so i intentionally make the operation observable
    const msg = public_state_message(type, ...args);
    receiver.next(msg);
} 


export function get_global_parent(){
    return parent.get_value();
}

export const observe_all_cells_update = (observeCommand: (msg: PublicStateMessage) => void, 
                                  observeCell: (cell: Cell) => void) => {
    pipe(receiver,
        filter((msg: PublicStateMessage) => msg.command === PublicStateCommand.ADD_CELL), 
        filter((msg: PublicStateMessage) => msg.args.length == 1 && msg.args[0] instanceof Cell),
        tap((msg: PublicStateMessage) => {
            observeCommand(msg);
            return msg
        }))
    .subscribe((msg: PublicStateMessage) => {
        const cell = msg.args[0]; 
        guard((cell instanceof Cell), throw_error(
            "observe_all_cells", 
            "observe_all_cells expects a cell, got " + cell, 
            msg.summarize()
        ));
        observeCell(cell);
    })
                
}

export const observe_cell_array = construct_readonly_reactor(all_cells)
export const observe_propagator_array = construct_readonly_reactor(all_propagators)
export const observe_amb_propagator_array = construct_readonly_reactor(all_amb_propagators)


import { layered_deep_equal } from 'sando-layer/Equality';
import { observe_premises_has_changed } from './DataTypes/Premises';

export const is_equal = construct_simple_generic_procedure("is_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

define_generic_procedure_handler(is_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_deep_equal(a, b);
    }
)






