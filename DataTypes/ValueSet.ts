// -*- TypeScript -*-

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { set_add_item, type BetterSet, construct_better_set, set_find, set_flat_map, set_for_each, set_has, is_better_set,  set_remove, set_every, set_some, to_array, set_map } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_layered_object } from "../temp_predicates";
import { add, divide, is_equal, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { is_atom, is_function, is_array, is_any } from "generic-handler/built_in_generics/generic_predicates";
import { less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { is_premises_in } from "./Premises";
import { get_base_value, the_nothing, is_nothing, is_unusable_value, value_imples } from "../Cell/CellValue";
import { map, filter, reduce } from "generic-handler/built_in_generics/generic_array_operation"
import { strongest_value } from "../Cell/StrongestValue";
import { pipe } from 'fp-ts/function';
import { generic_merge, merge_layered } from "../Cell/Merge";
// ValueSet class definition
export class ValueSet<A> {
    elements: BetterSet<A>;

    constructor(elements: BetterSet<A>) {
        this.elements = elements;
    }

    add_item(item: A): ValueSet<A> {
        return new ValueSet<A>(set_add_item(this.elements, item));
    }

    to_array(): A[] {
        return to_array(this.elements);
    }

    toString(): string {
        return `ValueSet: ${to_string(this.elements)})`;
    }
}

// Predicates and handlers
const is_value_set = register_predicate("is_value_set", (value: any) => value instanceof ValueSet);

define_generic_procedure_handler(to_string,
    match_args(is_layered_object),
    (value: LayeredObject) => value.describe_self()
);

define_generic_procedure_handler(to_string,
    match_args(is_better_set),
    (set: BetterSet<any>) => {
        const meta_data = set.meta_data;
        const keys = Array.from(meta_data.keys());
        const values = keys.map(key => to_string(meta_data.get(key)));
        return `${values.join(", ")}`;
    }
);

// ValueSet operations
define_generic_procedure_handler(map,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any) => {
        return new ValueSet(map(procedure, set.elements));
    }
);

define_generic_procedure_handler(filter,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, predicate: (a: any) => boolean) => {
        return new ValueSet(filter(predicate, set.elements));
    }
);

define_generic_procedure_handler(reduce,
    match_args(is_value_set, is_function, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any, initial: any) => {
        return reduce(set.elements, procedure, initial);
    }
);

// ValueSet construction
export const construct_value_set = construct_simple_generic_procedure("construct_value_set", 
    1,
    (elements: any) => {
        throw new Error("unimplemented");
    }
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_array),
    (elements: any[]) => {return construct_value_set(construct_better_set(elements, to_string));}
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_atom),
    (element: any) => {
        return construct_value_set([element]);
    }
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_better_set),
    (set: BetterSet<any>) => {
        return new ValueSet(set);
    }
);

// ValueSet utilities
function value_set_equals<A>(set1: ValueSet<A>, set2: ValueSet<A>): boolean {
    return set_every(set1.elements, (elt: A) => set_has(set2.elements, elt)) && set_every(set2.elements, (elt: A) => set_has(set1.elements, elt));
}

function to_value_set<A>(value: any): ValueSet<A> {
    return is_value_set(value) ? value : construct_value_set(value);
}

// ValueSet handlers
define_generic_procedure_handler(get_base_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => get_base_value(strongest_consequence(set))
);

define_generic_procedure_handler(is_unusable_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => is_unusable_value(strongest_consequence(set))
);

define_generic_procedure_handler(strongest_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => strongest_consequence(set)
);

// ValueSet operations

// define_generic_procedure_handler(generic_merge, match_args(is_value_set, is_any), merge_value_sets)

export function merge_value_sets<LayeredObject>(content: ValueSet<LayeredObject>, increment: LayeredObject): ValueSet<LayeredObject> {
    return is_nothing(increment) ? to_value_set(content) : value_set_adjoin(to_value_set(content), increment);
}

function value_set_adjoin<LayeredObject>(set: ValueSet<LayeredObject>, elt: LayeredObject): ValueSet<LayeredObject> {
    // @ts-ignore
    if (set_some(set.elements, (e: LayeredObject) => element_subsumes(elt, e))){
        return set;
    } else {
        return new ValueSet(set_add_item(set.elements, elt));
    }
}

function element_subsumes(elt1: LayeredObject, elt2: LayeredObject): boolean {
    return (
        value_imples(get_base_value(elt1), get_base_value(elt2)) &&
        less_than_or_equal(get_support_layer_value(elt1), get_support_layer_value(elt2))
    );
}

function strongest_consequence<A>(set: ValueSet<A>): A {
    return pipe(
        set.elements,
        (elements) => filter(elements, (elt: LayeredObject) => is_premises_in(get_support_layer_value(elt))),
        (filtered) => reduce(
            filtered,
            (acc: LayeredObject, item: LayeredObject) => merge_layered(acc, item),
            the_nothing,
        )
    );
}

// ValueSet arithmetic
function cross_join_map<A>(procedure: (elt_a: A, b: ValueSet<A>) => ValueSet<A>) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return (a: ValueSet<A>, b: ValueSet<A>) => 
        pipe(
            a.elements,
            (a: BetterSet<A>) => {
                return set_flat_map(a, (elt_a: A) => procedure(elt_a, b).elements);
            },
            construct_value_set
        );
}

function value_set_arithmetic<A>(procedure: (elt_a: A, elt_b: A) => A) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return cross_join_map((elt_a: A, b: ValueSet<A>) => 
        pipe(
            b.elements,
            (b: BetterSet<A>) => set_map(b, (elt_b: A) => {
                return procedure(elt_a, elt_b);
            }),
            construct_value_set
        )
    );
}

define_generic_procedure_handler(add,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(add)
);
 
define_generic_procedure_handler(subtract,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(subtract)
); 

define_generic_procedure_handler(multiply,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(multiply)
);

define_generic_procedure_handler(divide,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(divide)
);