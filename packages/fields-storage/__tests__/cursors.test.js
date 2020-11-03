import { useDatabase, createModel, createTestData } from "./utils";
import { encodeCursor } from "@commodo/fields-storage/cursor";

describe("Cursor based pagination", () => {
    const db = useDatabase();
    let Model;
    let data;

    beforeAll(async () => {
        Model = await createModel(db.getDatabase());
        data = await createTestData(Model);
    });

    test("should return all records", async () => {
        const models = await Model.find();
        expect(models.length).toBe(data.length);
        expect(models[0].id).toBe(data[data.length - 1].id);
    });

    test("should return a limited number of records", async () => {
        const args = { limit: 5 };
        const models = await Model.find(args);
        expect(models.length).toBe(5);
        expect(models.getMeta()).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[data.length - 5].id }),
                previous: null
            },
            hasNextPage: true,
            hasPreviousPage: false
        });
    });

    test("should return limited number of records with correct totalCount", async () => {
        const args = { limit: 5, totalCount: true };
        const models = await Model.find(args);
        expect(models.length).toBe(5);
        expect(models.getMeta()).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[data.length - 5].id }),
                previous: null
            },
            hasNextPage: true,
            hasPreviousPage: false,
            totalCount: 12
        });
    });

    test(`should return correct data using "after" cursor`, async () => {
        const page1Args = { limit: 5 };
        const page1 = await Model.find(page1Args);
        const page1Meta = page1.getMeta();

        const page2Args = { ...page1Args, after: page1Meta.cursors.next };
        const page2 = await Model.find(page2Args);
        const page2Meta = page2.getMeta();

        expect(page2.length).toBe(5);
        expect(page2Meta).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[2].id }),
                previous: encodeCursor({ id: data[6].id })
            },
            hasNextPage: true,
            hasPreviousPage: true
        });

        const page3Args = { ...page2Args, after: page2Meta.cursors.next };
        const page3 = await Model.find(page3Args);

        expect(page3.length).toBe(2);
        expect(page3.getMeta()).toMatchObject({
            cursors: {
                next: null,
                previous: encodeCursor({ id: data[1].id })
            },
            hasNextPage: false,
            hasPreviousPage: true
        });
    });

    test(`should return correct data using "before" cursor`, async () => {
        const cursor = encodeCursor({ id: data[8].id });
        const page1Args = { limit: 5, before: cursor };
        const page1 = await Model.find(page1Args);
        const page1Meta = page1.getMeta();

        expect(page1.length).toBe(3);
        expect(page1[0].id).toBe(data[11].id);
        expect(page1[2].id).toBe(data[9].id);
        expect(page1Meta).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[9].id }),
                previous: null
            },
            hasNextPage: true,
            hasPreviousPage: false
        });
    });

    test(`should return correct data using a sort field`, async () => {
        const page1Args = { limit: 8, sort: { price: -1 } };
        const page1 = await Model.find(page1Args);
        const page1Meta = page1.getMeta();

        expect(page1.length).toBe(8);
        expect(page1Meta).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[4].id, price: data[4].price }),
                previous: null
            },
            hasNextPage: true,
            hasPreviousPage: false
        });

        const page2Args = { ...page1Args, after: page1Meta.cursors.next };
        const page2 = await Model.find(page2Args);
        const page2Meta = page2.getMeta();

        expect(page2.length).toBe(4);
        expect(page2Meta).toMatchObject({
            cursors: {
                next: null,
                previous: encodeCursor({ id: data[1].id, price: data[1].price })
            },
            hasNextPage: false,
            hasPreviousPage: true
        });

        const page3Args = { ...page1Args, before: page2Meta.cursors.previous };
        const page3 = await Model.find(page3Args);

        expect(page3.length).toBe(8);
        expect(page3.getMeta()).toMatchObject({
            cursors: {
                next: encodeCursor({ id: data[4].id, price: data[4].price }),
                previous: null
            },
            hasNextPage: true,
            hasPreviousPage: false
        });
    });

    test(`should return correct data using a asc sort field`, async () => {
        const page1Args = { limit: 8, sort: { name: 1 } };
        const page1 = await Model.find(page1Args);
        const page1Meta = page1.getMeta();

        expect(page1).toEqual(expect.arrayContaining(data.slice(0, 8).map(d => expect.objectContaining(d))));
        expect(page1.length).toBe(8);

        const page2Args = { ...page1Args, after: page1Meta.cursors.next };
        const page2 = await Model.find(page2Args);
        const page2Meta = page2.getMeta();

        expect(page2).toEqual(expect.arrayContaining(data.slice(8).map(d => expect.objectContaining(d))));
        expect(page2.length).toBe(4);

        const page3Args = { ...page1Args, before: page2Meta.cursors.previous };
        const page3 = await Model.find(page3Args);

        expect(page3).toEqual(expect.arrayContaining(data.slice(0, 8).map(d => expect.objectContaining(d))));
        expect(page3.length).toBe(8);
    });
});
