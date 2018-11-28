/**
 * Copyright (c) AnyMessage.io. All rights reserved. http://www.anymessage.io
 *
 * The software in this package is published under the terms of the CPAL v1.0
 * license, a copy of which has been included with this distribution in the
 * LICENSE.md file.
 */
import { json, Request, Response, Router, urlencoded } from "express";
import { ITeamRequest } from "../custom";
import helpers = require("../helpers");
import { TeamModel } from "../models";
import { UserModel } from "../models";

const router: Router = Router();

// get users's team URL
router.get("/url", helpers.checkJwt, helpers.verifySubdomain, async (req: ITeamRequest, res: Response) => {
    try {
        const user = new UserModel(req.app.get("db"), req.user.email);
        await user.init();
        const teamId = user.getTeamId();

        let subdomain: string;
        if (teamId) {
            const team = new TeamModel(req.app.get("db"), teamId);
            await team.init();

            subdomain = team.getSubdomain();
        }

        res.status(200);
        res.send({teamURL: subdomain || ""});
    } catch (e) {
        console.error(e);
        res.status(e.status || 500);
        res.send(e.message || "");
    }
});

router.post("/url/available", helpers.checkJwt, json(), (req: Request, res: Response) => {
    helpers.verifyTeamName(req, (err, body) => {
        if (err) {
            res.statusCode = 400;
            res.json({errors: err});
        }

        req.app.get("db").teams.findOne({
            subdomain: body.newURL,
        }).then((team: any) => {
            if (team) {
                res.status(200);
                res.send({available: false});
            } else {
                res.status(200);
                res.send({available: true});
            }
        }).catch((error: string) => {
            console.error(error);
            res.sendStatus(500);
        });
    });
});

router.post("/url/set", helpers.checkJwt, json(), (req: Request, res: Response) => {
    helpers.verifyTeamName(req, (err, body) => {
        if (err) {
            res.statusCode = 400;
            res.json({errors: err});
        }

        // look up user by email (TODO generalize to more than auth0)
        req.app.get("db").users.find({
            email: req.user.email,
        }).then((result: any[]) => {
            const currentUser = result[0];
            if (currentUser.team_id) {
                // if user has team_id, update its URL
                req.app.get("db").teams.update({
                    id: currentUser.team_id,
                }, {
                    subdomain: body.newURL,
                }).then(() => {
                    res.status(200);
                    res.send({
                        redirectHost: `http://${body.newURL}.${process.env.UI_HOSTNAME}`, // todo handle ssl
                    });
                }).catch((error: string) => {
                    console.error(error);
                    res.sendStatus(500);
                });
            } else {
                // create a new team with URL
                req.app.get("db").teams.insert({
                    subdomain: body.newURL,
                }).then((team: any) => {
                    // associate it with a user
                    req.app.get("db").users.update(
                        {id: currentUser.id},
                        {team_id: team.id})
                    .then(() => {
                        res.status(200);
                        res.send({
                            redirectHost: `http://${body.newURL}.${process.env.UI_HOSTNAME}`, // todo handle ssl
                        });
                    }).catch((error: string) => {
                        console.error(error);
                        res.sendStatus(500);
                    });
                }).catch((error: string) => {
                    // TODO catch uniqueness error and throw to user
                    console.error(error);
                    res.sendStatus(500);
                });
            }
        }).catch((error: string) => {
            console.error(error);
            res.sendStatus(500);
        });
    });
});

export const TeamController: Router = router;
